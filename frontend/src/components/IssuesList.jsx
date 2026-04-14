import { useState } from 'react'

const SEVERITY_CONFIG = {
  high: {
    label: 'Критично',
    cardCls: 'border-rose-200 bg-rose-50/60',
    badgeCls: 'bg-rose-100 text-rose-700 border-rose-200',
    dotCls: 'bg-rose-500',
    quoteCls: 'border-rose-300/60 text-rose-800',
  },
  medium: {
    label: 'Важно',
    cardCls: 'border-amber-200 bg-amber-50/60',
    badgeCls: 'bg-amber-100 text-amber-700 border-amber-200',
    dotCls: 'bg-amber-500',
    quoteCls: 'border-amber-300/60 text-amber-800',
  },
  low: {
    label: 'К сведению',
    cardCls: 'border-sky-200 bg-sky-50/60',
    badgeCls: 'bg-sky-100 text-sky-700 border-sky-200',
    dotCls: 'bg-sky-400',
    quoteCls: 'border-sky-300/60 text-sky-800',
  },
}

const TYPE_LABELS = {
  vague_formulation: 'Расплывчатая формулировка',
  missing_kpi: 'Отсутствуют KPI',
  missing_deadline: 'Нет сроков',
  missing_methodology: 'Нет методологии',
  internal_contradiction: 'Внутреннее противоречие',
  incomplete_section: 'Неполный раздел',
  no_acceptance_criteria: 'Нет критериев приемки',
  timeline_conflict: 'Конфликт сроков',
  inconsistency: 'Несоответствие',
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IssueCard({ issue }) {
  const [expanded, setExpanded] = useState(true)
  const sev = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.low

  return (
    <div className={`rounded-[18px] border p-4 ${sev.cardCls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${sev.dotCls}`} />
            <span className="text-sm font-semibold text-slate-900">
              {TYPE_LABELS[issue.type] || issue.type}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${sev.badgeCls}`}>
              {sev.label}
            </span>
            {issue.section_title && (
              <span className="text-xs text-slate-500">· {issue.section_title}</span>
            )}
          </div>

          {issue.quote && (
            <blockquote className={`mt-3 rounded-[10px] border-l-2 pl-3 pr-2 py-1.5 text-xs italic leading-relaxed ${sev.quoteCls}`}>
              «{issue.quote}»
            </blockquote>
          )}

          {expanded && (
            <div className="mt-3 space-y-2">
              {issue.explanation && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Почему это плохо</div>
                  <p className="text-sm leading-relaxed text-slate-700">{issue.explanation}</p>
                </div>
              )}
              {issue.suggestion && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-500">Как исправить</div>
                  <p className="text-sm leading-relaxed text-slate-700">{issue.suggestion}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-0.5 shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-slate-600 transition-colors"
          aria-label={expanded ? 'Свернуть' : 'Развернуть'}
        >
          <ChevronIcon open={expanded} />
        </button>
      </div>
    </div>
  )
}

export default function IssuesList({ issues = [] }) {
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? issues : issues.filter((i) => i.severity === filter)
  const counts = {
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
  }

  const tabs = [
    { key: 'all', label: `Все (${issues.length})` },
    { key: 'high', label: `Критично (${counts.high})` },
    { key: 'medium', label: `Важно (${counts.medium})` },
    { key: 'low', label: `К сведению (${counts.low})` },
  ]

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-all ${
              filter === key
                ? 'border-cyan-500 bg-cyan-500 text-white shadow-[0_8px_18px_rgba(6,182,212,0.22)]'
                : 'border-slate-200 bg-white/85 text-slate-600 hover:border-cyan-200 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[18px] border border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400">
          Проблем в этой категории не найдено
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue, i) => (
            <IssueCard key={i} issue={issue} />
          ))}
        </div>
      )}
    </div>
  )
}
