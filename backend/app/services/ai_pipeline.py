import json
import re
from typing import AsyncIterator

from openai import APITimeoutError, AsyncOpenAI, RateLimitError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import settings
from app.services.rag_service import find_similar_examples

VAGUE_PATTERNS = [
    r"по мере возможности",
    r"улучшить качество",
    r"повысить эффективность",
    r"минимальн\w+",
    r"максимальн\w+",
    r"интуитивно понятн\w+",
    r"быстр\w+ отклик",
    r"соответствующим образом",
    r"высокое качество",
    r"над[её]жн\w+",
    r"эффективн\w+",
    r"современн\w+ метод",
    r"оптимальн\w+",
    r"гибк\w+ архитектур",
    r"удобн\w+ интерфейс",
    r"в разумные сроки",
    r"при необходимости",
]

STRUCTURE_AGENT_PROMPT = """
Ты — специализированный парсер научных и технических документов (ТЗ, НИР, НИОКР).

## Задача
Проанализируй текст технического задания и извлеки все смысловые разделы.
Для каждого раздела определи тип, извлеки оригинальный заголовок и полный текст.

## Типы разделов
Классифицируй каждый фрагмент по одному из типов:

| Тип               | Описание                                                       | Примеры заголовков                                 |
|-------------------|----------------------------------------------------------------|----------------------------------------------------|
| purpose           | Цель работы / проекта                                          | «Цель», «Цель проекта», «Назначение»               |
| tasks             | Задачи, перечень работ                                         | «Задачи», «Задачи проекта», «Содержание работ»     |
| kpi               | KPI, показатели эффективности, измеримые критерии успеха       | «Показатели», «KPI», «Критерии оценки»             |
| timeline          | Сроки, этапы, календарный план                                 | «Сроки», «Этапы», «Календарный план»               |
| resources         | Бюджет, финансирование, персонал, материально-технические рес. | «Бюджет», «Ресурсы», «Финансирование», «Команда»   |
| expected_results  | Ожидаемые результаты, выходные артефакты                       | «Результаты», «Выходные данные», «Deliverables»    |
| methodology       | Методология, методы исследования, подходы                      | «Методология», «Методы», «Подход»                  |
| background        | Актуальность, введение, обоснование                            | «Введение», «Актуальность», «Обоснование»          |
| requirements      | Требования, технические требования                             | «Требования», «Технические требования», «ТТ»       |
| other             | Всё остальное (приложения, глоссарий, подписи и т.д.)          |                                                    |

Обязательные типы для научного ТЗ: `purpose`, `tasks`, `kpi`, `timeline`, `resources`, `expected_results`.

## Правила извлечения
1. Не пропускай разделы — если раздел присутствует, он должен попасть в `sections`.
2. Не объединяй разные разделы в один объект.
3. Если раздел явно не озаглавлен, используй короткое описательное название в поле `title`.
4. `confidence` — вероятность правильной классификации типа (0.0–1.0); ставь < 0.75, если тип неоднозначен.
5. Если одному заголовку соответствует несколько типов (например, «Цели и задачи»), создай отдельный объект для каждого типа.
6. Сохраняй оригинальное форматирование текста в поле `text` (переносы строк, нумерация).

## Выходной формат
Верни **только** валидный JSON без каких-либо пояснений, markdown-обёрток и лишних символов.

{
  "sections": [
    {
      "id": "s1",
      "title": "оригинальный заголовок из документа",
      "text": "полный текст раздела",
      "type": "purpose",
      "confidence": 0.95
    }
  ],
  "missing_types": ["kpi", "timeline"],
  "document_summary": "краткое описание документа в 1-2 предложениях"
}
"""

QUALITY_AGENT_PROMPT = """
Ты — опытный эксперт-рецензент технических заданий для научных проектов и НИОКР.
За твоими плечами оценка более 500 ТЗ для научных фондов, университетов и корпоративных заказчиков.

## Задача
Тебе дан раздел ТЗ и несколько примеров из базы знаний.
Оцени раздел по 4 критериям и выяви проблемы с конкретными цитатами и предложениями по исправлению.

## Критерии оценки (шкала 1–5)

| Критерий                | Вес  | Описание                                                                 |
|-------------------------|------|--------------------------------------------------------------------------|
| structural_completeness | 30%  | Наличие всех обязательных структурных элементов раздела                  |
| measurability           | 25%  | Конкретность и однозначность формулировок, наличие числовых показателей  |
| logical_consistency     | 25%  | Отсутствие внутренних противоречий, согласованность с другими разделами  |
| kpi_quality             | 20%  | Качество KPI и критериев приёмки: измеримость, достижимость, полнота     |

**Шкала:** 5 — отлично, 4 — хорошо, 3 — удовлетворительно, 2 — слабо, 1 — неприемлемо.

## Типы проблем

| Тип                    | Когда применять                                                        |
|------------------------|------------------------------------------------------------------------|
| vague_formulation      | Расплывчатые слова: «улучшить», «повысить», «оптимизировать» без цифр  |
| missing_kpi            | Нет измеримых показателей успеха                                       |
| missing_deadline       | Отсутствуют сроки выполнения                                           |
| missing_methodology    | Не описаны методы достижения результата                                |
| internal_contradiction | Части раздела противоречат друг другу                                  |
| incomplete_section     | Раздел обрезан или явно не завершён                                    |
| no_acceptance_criteria | Нет критериев приёмки или условий завершения работы                    |

## Правила оценки
1. Для каждой оценки **ниже 4** обязательно указывай цитату из текста в `score_justifications`.
2. Проблемы формулируй предметно: что именно не так и как конкретно исправить.
3. Расплывчатые формулировки (`vague_formulation`) отмечай всегда, даже если общая оценка высокая.
4. Severity: `high` — блокирует приёмку, `medium` — требует доработки, `low` — рекомендация.
5. `positive_aspects` — не оставляй пустым: найди хотя бы одно сильное место раздела.

## Выходной формат
Верни **только** валидный JSON без каких-либо пояснений, markdown-обёрток и лишних символов.

{
  "section_id": "s1",
  "scores": {
    "structural_completeness": 3,
    "measurability": 2,
    "logical_consistency": 4,
    "kpi_quality": 1
  },
  "score_justifications": {
    "structural_completeness": "обоснование",
    "measurability": "обоснование",
    "logical_consistency": "обоснование",
    "kpi_quality": "обоснование"
  },
  "issues": [
    {
      "type": "missing_kpi",
      "severity": "high",
      "quote": "цитата из текста",
      "explanation": "почему это проблема",
      "suggestion": "как исправить"
    }
  ],
  "positive_aspects": ["что в разделе хорошо"]
}
"""

CONSISTENCY_AGENT_PROMPT = """
Ты — логический аналитик технических документов.

## Задача
Найди противоречия и несоответствия между разделами технического задания.
Работай строго в два шага: сначала извлечение фактов, затем их сравнение.

## Шаг 1 — Извлечение фактов
Извлеки все числовые и фактические утверждения из каждого раздела:

| Категория  | Что извлекать                                                         |
|------------|-----------------------------------------------------------------------|
| deadlines  | Любые даты, сроки, длительности                                       |
| budgets    | Суммы, статьи расходов, лимиты финансирования                         |
| kpis       | Показатели с числовыми значениями или целевыми метриками              |
| resources  | Персонал, оборудование, мощности — всё с количественными параметрами  |
| methods    | Упомянутые методы, технологии, инструменты                            |

Для каждого факта обязательно фиксируй раздел-источник и точную цитату.

## Шаг 2 — Поиск противоречий
Сравни извлечённые факты между собой. Проверяй:
- **timeline_conflict** — даты или сроки из разных разделов не совпадают
- **budget_conflict** — суммы или статьи расходов расходятся
- **kpi_conflict** — одни и те же показатели имеют разные значения
- **resource_conflict** — объём или состав ресурсов указан по-разному
- **method_conflict** — методы из разных разделов логически исключают друг друга
- **scope_conflict** — объём работ в задачах не соответствует срокам или бюджету

**Severity:**
- `high` — противоречие блокирует исполнение или приёмку документа
- `medium` — требует уточнения перед началом работ
- `low` — редакционное несоответствие, не влияет на исполнение

**`consistency_score`** — целое число от 0 до 100:
- 90–100: документ согласован, противоречий нет
- 70–89: есть незначительные несоответствия
- 50–69: есть существенные конфликты, требующие разрешения
- < 50: документ внутренне противоречив, требует переработки

## Выходной формат
Верни **только** валидный JSON без каких-либо пояснений, markdown-обёрток и лишних символов.

{
  "extracted_facts": {
    "deadlines": [{"section": "...", "value": "...", "quote": "..."}],
    "budgets": [{"section": "...", "value": "...", "quote": "..."}],
    "kpis": [{"section": "...", "name": "...", "value": "...", "quote": "..."}],
    "resources": [{"section": "...", "type": "...", "value": "...", "quote": "..."}],
    "methods": [{"section": "...", "name": "...", "quote": "..."}]
  },
  "contradictions": [
    {
      "type": "timeline_conflict",
      "section_a": "название раздела А",
      "section_b": "название раздела Б",
      "quote_a": "цитата из раздела А",
      "quote_b": "цитата из раздела Б",
      "explanation": "объяснение противоречия",
      "severity": "high"
    }
  ],
  "consistency_score": 85,
  "overall_coherence": "краткая оценка логической связности документа"
}
"""

IMPROVED_TEXT_PROMPT = """
Ты — опытный технический писатель, специализирующийся на ТЗ для научных проектов и НИОКР.

## Задача
Улучши формулировки раздела ТЗ: сделай их более конкретными, измеримыми и пригодными для оценки выполнения.

## Что разрешено
- Переформулировать расплывчатые выражения, сохраняя исходный смысл.
- Добавлять шаблонные уточняющие конструкции — например: «значение подлежит согласованию», «определяется на этапе планирования», «не менее X (уточняется заказчиком)».
- Заменять неопределённые глаголы («улучшить», «повысить», «оптимизировать») на измеримые конструкции с явным указанием, что метрика подлежит согласованию.

## Что запрещено
- Придумывать конкретные числа, даты, бюджеты или технологии, которых нет в исходном тексте.
- Менять смысл, область применения или цель проекта.
- Добавлять новые разделы, задачи или требования.
- Удалять информацию из исходного текста.

## Расплывчатые формулировки — как исправлять

| Было                        | Стало                                                                 |
|-----------------------------|-----------------------------------------------------------------------|
| «повысить точность»         | «повысить точность до уровня, согласованного с заказчиком»            |
| «в короткие сроки»          | «в сроки, определённые календарным планом»                            |
| «современные методы»        | «методы, соответствующие актуальному уровню развития области»         |
| «значительный эффект»       | «измеримый эффект с критериями оценки, согласованными с заказчиком»   |

## Требования к результату
- Язык: русский.
- Структура и порядок разделов оригинала сохраняются.
- Объём текста не должен значительно превышать оригинал.
"""

EXAMPLE_TZ_PROMPT = """
Ты — эксперт по написанию технических заданий для научных проектов и НИОКР.

## Задача
Составь качественный пример технического задания по указанной предметной области.
Пример должен демонстрировать эталонный стиль: конкретные формулировки, измеримые KPI, реалистичные сроки и бюджет.

## Структура документа
Включи все разделы в указанном порядке:

| № | Раздел                    | Что должно быть внутри                                                              |
|---|---------------------------|-------------------------------------------------------------------------------------|
| 1 | Название проекта          | Чёткое, отражающее предмет и ожидаемый результат                                   |
| 2 | Актуальность и обоснование| Проблема, её масштаб, почему важно решить именно сейчас                             |
| 3 | Цель работы               | Одна конкретная и измеримая цель, начинающаяся с глагола («Разработать», «Создать») |
| 4 | Задачи                    | Нумерованный список: 4–7 задач, каждая — конкретный шаг к цели                     |
| 5 | Методология               | Методы исследования, инструменты, обоснование их выбора                             |
| 6 | Ожидаемые результаты      | Конкретные артефакты: прототип, статья, патент, база данных — с указанием формата   |
| 7 | KPI                       | 3–5 измеримых показателей с числовыми целевыми значениями и методами проверки       |
| 8 | Сроки выполнения          | Этапы с датами начала и окончания, ключевые контрольные точки                       |
| 9 | Необходимые ресурсы       | Персонал (роли и ставки), оборудование, бюджет по статьям                           |

## Требования к качеству
- Никаких расплывчатых формулировок: «улучшить», «повысить», «оптимизировать» — только с числовым целевым значением.
- KPI должны быть измеримы и верифицируемы внешним рецензентом.
- Сроки и бюджет должны быть реалистичны и согласованы между собой.
- Задачи должны логически вытекать из цели и покрывать всю методологию.

## Требования к оформлению
- Язык: русский.
- Каждый раздел начинается с заголовка второго уровня.
- Списки — нумерованные, без вложенности глубже одного уровня.
- Объём: 600–900 слов.
"""
CHAT_SYSTEM_PROMPT = """
Ты — AI-ассистент по анализу и улучшению технических заданий научных проектов и НИОКР.

## Роль
Ты помогаешь авторам ТЗ понять найденные проблемы, устранить их и улучшить качество документа.
Ты не переписываешь документ самостоятельно — ты объясняешь, направляешь и предлагаешь варианты.

## Правила общения
- Отвечай только по содержанию документа и связанным вопросам.
- Будь конкретен: ссылайся на разделы, цитируй проблемные места, предлагай точечные правки.
- Не используй расплывчатые советы вроде «сделайте лучше» — всегда объясняй как именно.
- Если вопрос выходит за рамки документа, вежливо верни фокус на ТЗ.
- Язык: русский, деловой стиль, без излишних вводных конструкций.
"""


def _get_openai_client() -> AsyncOpenAI:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return AsyncOpenAI(api_key=settings.openai_api_key)


def detect_vague_patterns(text: str) -> list[str]:
    found = []
    for pattern in VAGUE_PATTERNS:
        found.extend(re.findall(pattern, text, re.IGNORECASE))
    return list(set(found))


def _compute_weighted_score(scores: dict) -> float:
    weights = {
        "structural_completeness": 0.30,
        "measurability": 0.25,
        "logical_consistency": 0.25,
        "kpi_quality": 0.20,
    }
    weighted_sum = sum(scores.get(dim, 3) * weight for dim, weight in weights.items())
    return (weighted_sum - 1) / 4 * 100


def _count_present_required_sections(sections: list) -> int:
    required_types = {"purpose", "tasks", "kpi", "timeline", "resources", "expected_results"}
    present_types = {section.get("type") for section in sections}
    return len(required_types & present_types)


@retry(
    retry=retry_if_exception_type((RateLimitError, APITimeoutError)),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(4),
)
async def run_structure_agent(text: str) -> dict:
    client = _get_openai_client()
    response = await client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": STRUCTURE_AGENT_PROMPT},
            {"role": "user", "content": f"Проанализируй структуру следующего ТЗ:\n\n{text[:8000]}"},
        ],
        temperature=0,
    )
    return json.loads(response.choices[0].message.content)


@retry(
    retry=retry_if_exception_type((RateLimitError, APITimeoutError)),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(4),
)
async def run_quality_agent(section: dict, similar_examples: list) -> dict:
    client = _get_openai_client()
    vague_found = detect_vague_patterns(section.get("text", ""))

    examples_text = ""
    if similar_examples:
        examples_text = "\n\nПРИМЕРЫ ИЗ БАЗЫ ЗНАНИЙ:\n"
        for i, ex in enumerate(similar_examples, 1):
            quality_label = "ХОРОШИЙ ПРИМЕР" if ex["quality"] == "high" else "ПЛОХОЙ ПРИМЕР"
            examples_text += f"\n{i}. {quality_label} [{ex['section_type']}]\n"
            examples_text += f"Текст: {ex['text'][:400]}\n"
            examples_text += f"Аннотация: {ex['annotation']}\n"

    vague_hint = ""
    if vague_found:
        vague_hint = (
            "\n\nPRE-CHECK: обнаружены расплывчатые формулировки: "
            f"{', '.join(vague_found[:10])}.\n"
            "Обязательно отметь их как проблемы типа vague_formulation."
        )

    user_content = f"""Раздел для анализа:
Тип: {section['type']}
Заголовок: {section['title']}
Текст:
{section['text'][:2000]}
{examples_text}{vague_hint}"""

    response = await client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": QUALITY_AGENT_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0,
    )
    result = json.loads(response.choices[0].message.content)
    result["section_id"] = section.get("id", "unknown")
    result["total_section_score"] = _compute_weighted_score(result.get("scores", {}))
    return result


@retry(
    retry=retry_if_exception_type((RateLimitError, APITimeoutError)),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(4),
)
async def run_consistency_agent(sections: list) -> dict:
    client = _get_openai_client()
    sections_text = ""
    for sec in sections:
        sections_text += f"\n=== {sec['title']} ({sec['type']}) ===\n{sec['text'][:600]}\n"

    response = await client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": CONSISTENCY_AGENT_PROMPT},
            {
                "role": "user",
                "content": (
                    "Шаг 1: извлеки все ключевые факты из разделов.\n"
                    "Шаг 2: сравни факты на логическую и числовую несовместимость.\n\n"
                    f"Разделы ТЗ:\n{sections_text[:6000]}"
                ),
            },
        ],
        temperature=0,
    )
    return json.loads(response.choices[0].message.content)


@retry(
    retry=retry_if_exception_type((RateLimitError, APITimeoutError)),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(4),
)
async def generate_improved_text(original_text: str, issues: list) -> str:
    client = _get_openai_client()
    issues_summary = "\n".join(
        f"- [{i['severity']}] {i['type']}: {i['explanation']} -> {i.get('suggestion', '')}"
        for i in issues[:15]
    )

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": IMPROVED_TEXT_PROMPT},
            {
                "role": "user",
                "content": f"""ОРИГИНАЛЬНЫЙ ТЕКСТ ТЗ:
{original_text[:6000]}

ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ:
{issues_summary}

Создай улучшенную версию ТЗ, исправив формулировки без изменения сути проекта.""",
            },
        ],
        temperature=0.2,
        max_tokens=4000,
    )
    return response.choices[0].message.content


@retry(
    retry=retry_if_exception_type((RateLimitError, APITimeoutError)),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(4),
)
async def generate_example_tz(domain: str) -> str:
    client = _get_openai_client()
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": EXAMPLE_TZ_PROMPT},
            {"role": "user", "content": f"Создай пример хорошего ТЗ для научного проекта в области: {domain}"},
        ],
        temperature=0.4,
        max_tokens=3000,
    )
    return response.choices[0].message.content


async def chat_with_document(document_text: str, history: list, user_message: str) -> str:
    client = _get_openai_client()
    messages = _build_chat_messages(document_text, history, user_message)
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.5,
        max_tokens=1000,
    )
    return response.choices[0].message.content


async def chat_with_document_stream(
    document_text: str, history: list, user_message: str
) -> AsyncIterator[str]:
    client = _get_openai_client()
    messages = _build_chat_messages(document_text, history, user_message)
    stream = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.5,
        max_tokens=1000,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def _build_chat_messages(document_text: str, history: list, user_message: str) -> list:
    messages = [
        {
            "role": "system",
            "content": f"{CHAT_SYSTEM_PROMPT}\n\nСОДЕРЖИМОЕ ДОКУМЕНТА:\n{document_text[:4000]}",
        }
    ]
    for msg in history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})
    return messages


def _aggregate_results(structure: dict, quality_results: list, consistency: dict, missing_types: list) -> dict:
    all_issues = []
    section_score_sum = 0
    section_count = 0

    dim_sums = {
        "structural_completeness": 0,
        "measurability": 0,
        "logical_consistency": 0,
        "kpi_quality": 0,
    }

    for qr in quality_results:
        section_count += 1
        section_score_sum += qr.get("total_section_score", 50)

        for dim in dim_sums:
            dim_sums[dim] += qr.get("scores", {}).get(dim, 3)

        for issue in qr.get("issues", []):
            section_title = next(
                (s["title"] for s in structure.get("sections", []) if s["id"] == qr["section_id"]),
                qr["section_id"],
            )
            all_issues.append({**issue, "section_id": qr["section_id"], "section_title": section_title})

    for contradiction in consistency.get("contradictions", []):
        all_issues.append(
            {
                "type": contradiction.get("type", "inconsistency"),
                "severity": contradiction.get("severity", "medium"),
                "section_title": f"{contradiction.get('section_a')} <-> {contradiction.get('section_b')}",
                "quote": contradiction.get("quote_a", ""),
                "explanation": contradiction.get("explanation", ""),
                "suggestion": "Устраните противоречие между разделами",
            }
        )

    severity_order = {"high": 0, "medium": 1, "low": 2}
    all_issues.sort(key=lambda x: severity_order.get(x.get("severity", "low"), 2))

    sections = structure.get("sections", [])
    base_score = (section_score_sum / section_count) if section_count > 0 else 50
    present_required_count = _count_present_required_sections(sections)
    avg_dimension_score = sum(dim_sums.values()) / (len(dim_sums) * max(section_count, 1))

    coverage_bonus = present_required_count / 6 * 20
    quality_bonus = max(0, (avg_dimension_score - 3) * 16)
    # missing_types reported by the structure AI can be noisy; cap penalty and weight lightly
    missing_penalty = min(len(missing_types), 2) * 4
    high_issues = sum(1 for i in all_issues if i.get("severity") == "high")
    medium_issues = sum(1 for i in all_issues if i.get("severity") == "medium")
    low_issues = sum(1 for i in all_issues if i.get("severity") == "low")
    consistency_bonus = consistency.get("consistency_score", 70) / 100 * 10

    # bonus for full required section coverage with no truly missing required types
    full_coverage_bonus = 6 if present_required_count == 6 else 0

    raw_score = (
        base_score * 0.55
        + coverage_bonus
        + quality_bonus
        + consistency_bonus
        + full_coverage_bonus
        - missing_penalty
        - high_issues * 1.2
        - medium_issues * 0.5
        - low_issues * 0.2
    )

    # Guardrail for "good but not perfect" documents:
    # if the document covers almost all required sections and the section quality
    # is consistently above average, don't let issue accumulation push it too low.
    calibrated_floor = 0
    consistency_ok = consistency.get("consistency_score", 70) >= 75
    if present_required_count == 6 and avg_dimension_score >= 3.8 and consistency_ok and len(missing_types) == 0:
        calibrated_floor = 82
    elif present_required_count >= 5 and avg_dimension_score >= 3.5 and consistency_ok:
        calibrated_floor = 74 if len(missing_types) == 0 else 68
    elif present_required_count >= 4 and avg_dimension_score >= 3.3 and consistency.get("consistency_score", 70) >= 70:
        calibrated_floor = 60 if len(missing_types) <= 1 else 54

    final_score = max(0, min(100, max(raw_score, calibrated_floor)))

    n = max(section_count, 1)
    score_breakdown = {
        "structure": max(0, 20 - len(missing_types) * 4),
        # measurability AI dim = "измеримость и однозначность" → maps to clarity of formulations
        "clarity": round(dim_sums["measurability"] / n / 5 * 20),
        # structural_completeness AI dim = completeness of each section
        "completeness": round(dim_sums["structural_completeness"] / n / 5 * 20),
        # kpi_quality AI dim = quality of success criteria → measurability of outcomes
        "measurability": round(dim_sums["kpi_quality"] / n / 5 * 20),
        # combine per-section logical consistency + document-wide consistency score
        "logic": round(
            dim_sums["logical_consistency"] / n / 5 * 10
            + consistency.get("consistency_score", 70) / 10
        ),
    }

    recommendations = []
    seen_types = set()
    for issue in all_issues:
        if issue["type"] not in seen_types and len(recommendations) < 10:
            seen_types.add(issue["type"])
            recommendations.append(
                {
                    "priority": issue.get("severity", "medium"),
                    "section": issue.get("section_title", ""),
                    "issue_type": issue["type"],
                    "suggestion": issue.get("suggestion", issue.get("explanation", "")),
                }
            )

    for missing_type in missing_types:
        recommendations.append(
            {
                "priority": "high",
                "section": "Документ",
                "issue_type": "missing_section",
                "suggestion": f"Добавьте раздел '{missing_type}' - он обязателен для научного ТЗ.",
            }
        )

    structure_template = [
        "1. Общие сведения о проекте",
        "2. Актуальность и обоснование",
        "3. Цель работы",
        "4. Задачи и этапы",
        "5. Методология исследования",
        "6. KPI и критерии успеха",
        "7. Ожидаемые результаты",
        "8. Ресурсы и бюджет",
        "9. Риски и меры митигации",
        "10. Отчетность и документация",
    ]

    return {
        "score": round(final_score, 1),
        "score_breakdown": score_breakdown,
        "sections": structure.get("sections", []),
        "missing_sections": missing_types,
        "issues": all_issues[:20],
        "recommendations": recommendations[:12],
        "structure_template": structure_template,
        "document_summary": structure.get("document_summary", ""),
        "consistency_score": consistency.get("consistency_score", 70),
        "overall_coherence": consistency.get("overall_coherence", ""),
    }


async def run_full_pipeline(document_text: str) -> dict:
    structure = await run_structure_agent(document_text)
    sections = structure.get("sections", [])
    missing_types = structure.get("missing_types", [])

    quality_results = []
    for section in sections[:8]:
        similar = find_similar_examples(
            section.get("text", ""),
            section_type=section.get("type"),
            top_k=3,
        )
        quality_results.append(await run_quality_agent(section, similar))

    consistency = await run_consistency_agent(sections)
    result = _aggregate_results(structure, quality_results, consistency, missing_types)

    if result["issues"]:
        result["improved_text"] = await generate_improved_text(document_text, result["issues"])
    else:
        result["improved_text"] = document_text

    return result
