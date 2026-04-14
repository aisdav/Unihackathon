import React from 'react'

const STEPS = [
  {
    id: 1,
    label: 'Структурный разбор',
    desc: 'Система выделяет разделы, смысловые блоки и ключевые сущности документа.',
  },
  {
    id: 2,
    label: 'Сопоставление с эталонами',
    desc: 'RAG поднимает похожие хорошие и слабые примеры, затем оценивается качество формулировок.',
  },
  {
    id: 3,
    label: 'Проверка логики',
    desc: 'Анализируются связи между целью, задачами, KPI, сроками и ожидаемыми результатами.',
  },
]

function StepIcon({ state, index }) {
  if (state === 'done') {
    return (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 10.5 8 14.5 16 6.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (state === 'running') {
    return (
      <svg className="h-5 w-5 animate-spin" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 3a7 7 0 1 1-4.95 2.05" strokeLinecap="round" />
      </svg>
    )
  }

  return <span className="text-sm font-semibold">{String(index + 1).padStart(2, '0')}</span>
}

export default function PipelineProgress({ status }) {
  const isCompleted = status === 'completed'
  const isFailed = status === 'failed'
  const isRunning = status === 'running'

  return (
    <div className="space-y-4">
      {STEPS.map((step, index) => {
        let state = 'pending'
        if (isCompleted) state = 'done'
        else if (isFailed) state = index === 0 ? 'done' : 'pending'
        else if (isRunning) state = index === 0 ? 'done' : index === 1 ? 'running' : 'pending'

        const stateClass =
          state === 'done'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : state === 'running'
              ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
              : 'border-slate-200 bg-slate-50 text-slate-400'

        return (
          <div key={step.id} className="relative overflow-hidden rounded-[22px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,31,53,0.05)]">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${stateClass}`}>
                <StepIcon state={state} index={index} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h4 className={`text-sm font-semibold ${state === 'pending' ? 'text-slate-600' : 'text-slate-900'}`}>
                    {step.label}
                  </h4>
                  {state === 'running' && (
                    <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                      в работе
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">{step.desc}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
