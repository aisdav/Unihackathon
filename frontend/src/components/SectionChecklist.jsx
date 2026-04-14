const TYPE_LABELS = {
  purpose: 'Цель работы',
  tasks: 'Задачи',
  kpi: 'KPI / Показатели',
  timeline: 'Сроки / Этапы',
  resources: 'Ресурсы / Бюджет',
  expected_results: 'Ожидаемые результаты',
  methodology: 'Методология',
  background: 'Актуальность',
  requirements: 'Требования',
  other: 'Прочее',
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8.5 6.5 12 13 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 5l6 6M11 5l-6 6" strokeLinecap="round" />
    </svg>
  )
}

export default function SectionChecklist({ sections = [], missingSections = [] }) {
  const foundTypes = new Set(sections.map((s) => s.type))
  const required = ['purpose', 'tasks', 'kpi', 'timeline', 'resources', 'expected_results']

  return (
    <div className="grid grid-cols-2 gap-2">
      {required.map((type) => {
        const found = foundTypes.has(type) && !missingSections.includes(type)
        return (
          <div
            key={type}
            className={`flex items-center gap-2.5 rounded-[14px] border px-3 py-2.5 text-sm font-medium transition-colors ${
              found
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {found ? <CheckIcon /> : <CrossIcon />}
            <span>{TYPE_LABELS[type] || type}</span>
          </div>
        )
      })}
    </div>
  )
}
