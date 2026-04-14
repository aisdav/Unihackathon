from jinja2 import Environment, DictLoader
from datetime import datetime

REPORT_HTML = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'DejaVu Sans', Arial, sans-serif; margin: 40px; color: #1a1a2e; font-size: 13px; }
  h1 { color: #16213e; font-size: 22px; border-bottom: 2px solid #0f3460; padding-bottom: 10px; }
  h2 { color: #0f3460; font-size: 16px; margin-top: 24px; }
  .score-badge { display: inline-block; padding: 10px 20px; border-radius: 50px; font-size: 28px; font-weight: bold; color: white; }
  .score-high { background: #27ae60; }
  .score-mid { background: #f39c12; }
  .score-low { background: #e74c3c; }
  .breakdown { display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; }
  .metric { background: #f8f9fa; border-radius: 8px; padding: 10px 16px; min-width: 120px; }
  .metric-label { font-size: 11px; color: #666; }
  .metric-value { font-size: 20px; font-weight: bold; color: #0f3460; }
  .issue { padding: 10px 14px; margin: 8px 0; border-radius: 6px; border-left: 4px solid; }
  .issue-high { background: #fdf3f3; border-color: #e74c3c; }
  .issue-medium { background: #fdf8ec; border-color: #f39c12; }
  .issue-low { background: #f0f7ff; border-color: #3498db; }
  .issue-quote { font-style: italic; color: #555; font-size: 12px; margin: 4px 0; }
  .recommendation { padding: 8px 14px; margin: 6px 0; background: #f0fff4; border-left: 4px solid #27ae60; border-radius: 6px; }
  .section-check { padding: 6px 12px; margin: 4px 0; border-radius: 4px; }
  .section-ok { background: #f0fff4; color: #27ae60; }
  .section-missing { background: #fdf3f3; color: #e74c3c; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; color: #888; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #0f3460; color: white; padding: 8px; text-align: left; }
  td { padding: 7px 8px; border-bottom: 1px solid #eee; }
</style>
</head>
<body>
<h1>Отчёт анализа технического задания</h1>
<p><strong>Файл:</strong> {{ filename }}<br>
<strong>Дата анализа:</strong> {{ date }}</p>

<h2>Общая оценка качества</h2>
<div class="score-badge {% if score >= 75 %}score-high{% elif score >= 50 %}score-mid{% else %}score-low{% endif %}">
  {{ score }}/100
</div>
{% if document_summary %}
<p>{{ document_summary }}</p>
{% endif %}
{% if consistency_score is not none %}
<p><strong>Логическая связность:</strong> {{ consistency_score }}/100</p>
{% endif %}
{% if overall_coherence %}
<p><strong>Комментарий по согласованности:</strong> {{ overall_coherence }}</p>
{% endif %}

<h2>Детализация оценки</h2>
<table>
  <tr><th>Критерий</th><th>Баллы</th></tr>
  {% for key, val in score_breakdown.items() %}
  <tr><td>{{ criterion_names.get(key, key) }}</td><td>{{ val }}/20</td></tr>
  {% endfor %}
</table>

<h2>Структура документа</h2>
{% for s in sections %}
<div class="section-check section-ok">✅ {{ s.title }} ({{ s.type }})</div>
{% endfor %}
{% for ms in missing_sections %}
<div class="section-check section-missing">❌ Отсутствует: {{ ms }}</div>
{% endfor %}

<h2>Выявленные проблемы ({{ issues|length }})</h2>
{% for issue in issues %}
<div class="issue issue-{{ issue.severity }}">
  <strong>[{{ issue.severity|upper }}] {{ issue.type }}</strong>
  {% if issue.section_title %} — {{ issue.section_title }}{% endif %}<br>
  {% if issue.quote %}<div class="issue-quote">«{{ issue.quote[:200] }}»</div>{% endif %}
  <div>{{ issue.explanation }}</div>
  {% if issue.suggestion %}<div style="color:#27ae60;margin-top:4px">→ {{ issue.suggestion }}</div>{% endif %}
</div>
{% endfor %}

<h2>Рекомендации по улучшению</h2>
{% for rec in recommendations %}
<div class="recommendation">
  <strong>[{{ rec.priority|upper }}]</strong> {{ rec.suggestion }}
  {% if rec.section %}<em>({{ rec.section }})</em>{% endif %}
</div>
{% endfor %}

<h2>Рекомендуемая структура ТЗ</h2>
{% for item in structure_template %}
<div style="padding: 4px 12px; border-left: 3px solid #0f3460; margin: 4px 0;">{{ item }}</div>
{% endfor %}

<div class="footer">
  Отчёт сгенерирован AI-системой анализа ТЗ | {{ date }}
</div>
</body>
</html>"""


def generate_pdf_report(
    filename: str,
    score: float,
    score_breakdown: dict,
    sections: list,
    missing_sections: list,
    issues: list,
    recommendations: list,
    structure_template: list,
    document_summary: str | None = None,
    consistency_score: float | None = None,
    overall_coherence: str | None = None,
) -> bytes:
    env = Environment(loader=DictLoader({"report.html": REPORT_HTML}))
    template = env.get_template("report.html")

    criterion_names = {
        "structure": "Структура документа",
        "clarity": "Ясность формулировок",
        "completeness": "Полнота содержания",
        "measurability": "Измеримость показателей",
        "logic": "Логическая связность",
    }

    html = template.render(
        filename=filename,
        date=datetime.now().strftime("%d.%m.%Y %H:%M"),
        score=score,
        score_breakdown=score_breakdown or {},
        sections=sections or [],
        missing_sections=missing_sections or [],
        issues=issues or [],
        recommendations=recommendations or [],
        structure_template=structure_template or [],
        document_summary=document_summary,
        consistency_score=consistency_score,
        overall_coherence=overall_coherence,
        criterion_names=criterion_names,
    )

    # Try WeasyPrint, fallback to returning HTML as bytes
    try:
        import weasyprint
        return weasyprint.HTML(string=html).write_pdf()
    except Exception:
        return html.encode("utf-8")
