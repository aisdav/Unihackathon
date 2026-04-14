const LOGIC_STEPS = [
  { key: 'purpose', label: 'Цель' },
  { key: 'tasks', label: 'Задачи' },
  { key: 'kpi', label: 'KPI' },
  { key: 'expected_results', label: 'Результаты' },
]

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 8.5 6.5 12 13 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 5l6 6M11 5l-6 6" strokeLinecap="round" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4 text-slate-300" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Node({ label, ok }) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-[18px] border px-4 py-3 min-w-[96px] ${
      ok
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-rose-200 bg-rose-50 text-rose-700'
    }`}>
      <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${
        ok ? 'border-emerald-300 bg-white' : 'border-rose-300 bg-white'
      }`}>
        {ok ? <CheckIcon /> : <CrossIcon />}
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </div>
  )
}

export default function LogicGraph({ sections = [], missingSections = [] }) {
  const foundTypes = new Set(sections.map((s) => s.type))
  const isOk = (type) => foundTypes.has(type) && !missingSections.includes(type)

  const links = [
    { from: 'purpose', to: 'tasks', ok: isOk('purpose') && isOk('tasks'), label: 'цель → задачи' },
    { from: 'tasks', to: 'kpi', ok: isOk('tasks') && isOk('kpi'), label: 'задачи → KPI' },
    { from: 'kpi', to: 'expected_results', ok: isOk('kpi') && isOk('expected_results'), label: 'KPI → результаты' },
  ]

  const allOk = links.every((l) => l.ok)

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="section-title text-slate-500">Логическая цепочка</div>
          <p className="mt-1 text-sm text-slate-500">Как цель, задачи, KPI и результаты связаны между собой.</p>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${
          allOk
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-rose-200 bg-rose-50 text-rose-700'
        }`}>
          {allOk ? 'Цепочка замкнута' : 'Есть разрывы'}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {LOGIC_STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center gap-3">
            <Node label={step.label} ok={isOk(step.key)} />
            {i < LOGIC_STEPS.length - 1 && <ArrowIcon />}
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {links.map((link) => (
          <div
            key={`${link.from}-${link.to}`}
            className={`flex items-center gap-2.5 rounded-[14px] border px-3 py-2 text-sm ${
              link.ok
                ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700'
                : 'border-rose-200 bg-rose-50/60 text-rose-700'
            }`}
          >
            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${link.ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="font-medium capitalize">{link.label}</span>
            <span className="text-xs opacity-70">— {link.ok ? 'связь есть' : 'связь отсутствует'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
