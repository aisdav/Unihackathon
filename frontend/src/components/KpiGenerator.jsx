import React from 'react'

function buildKpiIdeas(analysis) {
  const hasKpiGap =
    (analysis?.missing_sections || []).includes('kpi') ||
    (analysis?.issues || []).some((issue) => issue.type === 'missing_kpi')

  if (!hasKpiGap) return []

  return [
    {
      title: 'Качество документа',
      value: 'Доля обязательных разделов, заполненных без критичных замечаний, не ниже 95%.',
      why: 'Хороший KPI, потому что напрямую отражает полноту и качество ТЗ.',
      measure: 'Измеряется по чек-листу обязательных разделов и числу high-severity issues.',
    },
    {
      title: 'Измеримость требований',
      value: 'Не менее 80% ключевых требований должны содержать числовой критерий или проверяемое условие.',
      why: 'Хороший KPI, потому что убирает расплывчатые формулировки и делает ТЗ проверяемым.',
      measure: 'Измеряется как доля требований с метрикой, сроком или критерием приемки.',
    },
    {
      title: 'Логическая согласованность',
      value: 'Индекс логической согласованности документа должен быть не ниже 85 из 100.',
      why: 'Хороший KPI, потому что связывает цель, задачи, KPI и результаты в единую логику.',
      measure: 'Измеряется внутренним consistency score после анализа документа.',
    },
  ]
}

export default function KpiGenerator({ analysis }) {
  const ideas = buildKpiIdeas(analysis)

  if (ideas.length === 0) return null

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="font-semibold text-gray-900">KPI Generator</h3>
      <p className="text-xs text-gray-500 mt-1 mb-4">
        Быстрые варианты KPI, которые можно взять как основу и адаптировать под ваш проект.
      </p>

      <div className="space-y-3">
        {ideas.map((idea) => (
          <div key={idea.title} className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">{idea.title}</div>
            <div className="text-sm text-gray-800 mb-3">{idea.value}</div>
            <div className="grid gap-2 text-xs text-gray-600">
              <div><span className="font-semibold text-gray-700">Почему хороший:</span> {idea.why}</div>
              <div><span className="font-semibold text-gray-700">Как измерять:</span> {idea.measure}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
