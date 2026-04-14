const DIMENSIONS = [
  {
    key: 'structure',
    label: 'Структура',
    hint: 'Обязательные разделы и базовая форма документа.',
  },
  {
    key: 'clarity',
    label: 'Ясность',
    hint: 'Конкретность формулировок, нет двойного толкования.',
  },
  {
    key: 'completeness',
    label: 'Полнота',
    hint: 'Достаточно деталей, чтобы по ТЗ реально можно было работать.',
  },
  {
    key: 'measurability',
    label: 'Измеримость',
    hint: 'Конкретные KPI и критерии успеха, а не общие обещания.',
  },
  {
    key: 'logic',
    label: 'Логика',
    hint: 'Цель, задачи, сроки, ресурсы и результаты согласованы.',
  },
]

function DimensionRow({ label, hint, value, max = 20 }) {
  const pct = Math.round((value / max) * 100)
  const barColor =
    pct >= 75 ? 'bg-emerald-500' :
    pct >= 50 ? 'bg-amber-400' :
    'bg-rose-500'
  const scoreColor =
    pct >= 75 ? 'text-emerald-600' :
    pct >= 50 ? 'text-amber-600' :
    'text-rose-600'

  return (
    <div className="group">
      <div className="flex items-center gap-3">
        <span className="w-24 shrink-0 text-sm font-semibold text-slate-800">{label}</span>
        <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`w-12 shrink-0 text-right text-sm font-bold ${scoreColor}`}>
          {value}<span className="text-xs font-normal text-slate-400">/20</span>
        </span>
      </div>
      <p className="mt-1 pl-[6.5rem] text-xs leading-relaxed text-slate-400">{hint}</p>
    </div>
  )
}

export default function ScoreBreakdown({ breakdown }) {
  if (!breakdown) return null

  return (
    <div className="space-y-4">
      {DIMENSIONS.map(({ key, label, hint }) => (
        <DimensionRow
          key={key}
          label={label}
          hint={hint}
          value={breakdown[key] ?? 0}
        />
      ))}
    </div>
  )
}
