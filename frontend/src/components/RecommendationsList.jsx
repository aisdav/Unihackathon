const PRIORITY_CONFIG = {
  high: {
    label: 'Высокий приоритет',
    badgeCls: 'bg-rose-100 text-rose-700 border-rose-200',
    dotCls: 'bg-rose-500',
  },
  medium: {
    label: 'Средний приоритет',
    badgeCls: 'bg-amber-100 text-amber-700 border-amber-200',
    dotCls: 'bg-amber-400',
  },
  low: {
    label: 'Низкий приоритет',
    badgeCls: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dotCls: 'bg-emerald-500',
  },
}

function explainRec(text = '') {
  const t = text.toLowerCase()
  if (t.includes('kpi') || t.includes('показател')) return 'Переводит ожидания в измеримые критерии.'
  if (t.includes('срок') || t.includes('этап')) return 'Делает проект управляемым по времени.'
  if (t.includes('метод') || t.includes('методолог')) return 'Связывает результат с понятным способом достижения.'
  if (t.includes('раздел')) return 'Закрывает структурный пробел в документе.'
  return 'Делает ТЗ более конкретным и проверяемым.'
}

export default function RecommendationsList({ recommendations = [] }) {
  if (recommendations.length === 0) {
    return (
      <div className="rounded-[18px] border border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400">
        Рекомендаций нет
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recommendations.map((rec, i) => {
        const p = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.low
        return (
          <div
            key={i}
            className="rounded-[18px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_20px_rgba(15,31,53,0.04)]"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${p.dotCls}`} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${p.badgeCls}`}>
                    {p.label}
                  </span>
                  {rec.section && (
                    <span className="text-xs text-slate-400">{rec.section}</span>
                  )}
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-800">{rec.suggestion}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{explainRec(rec.suggestion)}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
