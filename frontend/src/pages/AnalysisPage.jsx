import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { downloadReport, getAnalysis, getImprovedText } from '../api/client'
import ImprovedDocViewer from '../components/ImprovedDocViewer'
import IssuesList from '../components/IssuesList'
import KpiGenerator from '../components/KpiGenerator'
import LogicGraph from '../components/LogicGraph'
import PipelineProgress from '../components/PipelineProgress'
import RecommendationsList from '../components/RecommendationsList'
import ScoreBreakdown from '../components/ScoreBreakdown'
import ScoreGauge from '../components/ScoreGauge'
import SectionChecklist from '../components/SectionChecklist'
import { useSeniorMode } from '../context/SeniorModeContext'

const POLL_INTERVAL = 3000

function ActionIcon({ type }) {
  if (type === 'download') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 4v10" strokeLinecap="round" />
        <path d="m8 10 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 18.5h14" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 10.5h8" strokeLinecap="round" />
      <path d="M8 14h5.5" strokeLinecap="round" />
      <path d="M18.25 18.5A1.75 1.75 0 0 1 16.5 20.25h-9A2.75 2.75 0 0 1 4.75 17.5v-11A2.75 2.75 0 0 1 7.5 3.75h6.88L19.25 8.6V18.5Z" />
      <path d="M14 3.75V9h5.25" />
    </svg>
  )
}

export default function AnalysisPage() {
  const { seniorMode } = useSeniorMode()
  const { docId } = useParams()
  const [analysis, setAnalysis] = useState(null)
  const [improved, setImproved] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const fetchAnalysis = useCallback(async () => {
    try {
      const res = await getAnalysis(docId)
      setAnalysis(res.data)
      return res.data.status
    } catch (err) {
      const detail = err.response?.data?.detail || 'Не удалось загрузить результаты анализа.'
      setError(detail)
      return 'error'
    } finally {
      setLoading(false)
    }
  }, [docId])

  useEffect(() => {
    let timer

    const poll = async () => {
      const status = await fetchAnalysis()
      if (status === 'pending' || status === 'running') {
        timer = setTimeout(poll, POLL_INTERVAL)
      }
    }

    poll()
    return () => clearTimeout(timer)
  }, [fetchAnalysis])

  useEffect(() => {
    if (analysis?.status === 'completed' && !improved) {
      getImprovedText(docId)
        .then((res) => setImproved(res.data))
        .catch(() => {})
    }
  }, [analysis?.status, docId, improved])

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const res = await downloadReport(docId)
      // res.data is already a Blob (responseType: 'blob')
      // Check if backend fell back to HTML (WeasyPrint unavailable)
      const contentType = res.headers?.['content-type'] || 'application/pdf'
      const ext = contentType.includes('text/html') ? 'html' : 'pdf'
      const url = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `report_${docId}.${ext}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      const detail = err.response?.data?.detail || 'Не удалось скачать PDF-отчет.'
      alert(detail)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center px-6">
        <div className="card w-full max-w-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-cyan-200 bg-cyan-50 text-cyan-700">
            <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3a9 9 0 1 1-6.36 2.64" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-slate-900">Загружаем результаты анализа</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Система собирает score, проблемные места, улучшенный текст и рекомендации.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-shell flex items-center justify-center px-6">
        <div className="card w-full max-w-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-rose-200 bg-rose-50 text-rose-700">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 8l8 8M16 8l-8 8" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-slate-900">Не удалось открыть анализ</h2>
          <p className="mt-3 text-sm leading-6 text-rose-700">{error}</p>
          <Link to="/dashboard" className="btn-secondary mt-6">
            Вернуться на главную
          </Link>
        </div>
      </div>
    )
  }

  const isPending = analysis?.status === 'pending' || analysis?.status === 'running'
  const isCompleted = analysis?.status === 'completed'
  const isFailed = analysis?.status === 'failed'
  const score = Math.round(analysis?.score || 0)
  const issueCount = (analysis?.issues || []).length
  const criticalCount = (analysis?.issues || []).filter((item) => item.severity === 'high').length
  const missingSections = analysis?.missing_sections || []
  const topIssue = (analysis?.issues || [])[0]
  const primaryAction =
    (analysis?.recommendations || [])[0]?.suggestion ||
    'Начните с раздела рекомендаций и исправьте замечания с высоким приоритетом.'

  const tabs = seniorMode
    ? [
        { key: 'overview', label: 'Обзор' },
        { key: 'issues', label: `Что не так${issueCount ? ` (${issueCount})` : ''}` },
        { key: 'recommendations', label: 'Что исправить' },
        { key: 'improved', label: 'Готовый текст' },
      ]
    : [
        { key: 'overview', label: 'Обзор' },
        { key: 'issues', label: `Проблемы${issueCount ? ` (${issueCount})` : ''}` },
        { key: 'recommendations', label: 'Рекомендации' },
        { key: 'improved', label: 'Улучшенный текст' },
      ]

  const scoreTone =
    score >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
    'bg-rose-50 text-rose-700 border-rose-200'

  return (
    <div className="app-shell">
      <header className="page-header px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 19 8 12l7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div>
              {!seniorMode && <div className="nav-pill w-fit">Analysis results</div>}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight text-slate-50">Результаты анализа документа</h1>
                {isCompleted && (
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${scoreTone}`}>
                    {score} / 100
                  </span>
                )}
              </div>
            </div>
          </div>

          {isCompleted && (
            <div className="flex flex-wrap gap-2">
              <button onClick={handleDownloadPDF} disabled={downloading} className="btn-secondary">
                <ActionIcon type="download" />
                {downloading ? 'Подготовка PDF' : 'Скачать PDF'}
              </button>
              <Link to={`/chat/${docId}`} className="btn-primary">
                <ActionIcon type="chat" />
                Открыть чат по ТЗ
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {isPending && (
          <section className="hero-panel">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
              <div>
                {!seniorMode && <div className="section-title">AI pipeline</div>}
                <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
                  {seniorMode ? 'Документ анализируется. Подождите немного.' : 'Система сейчас строит структурный и логический профиль документа.'}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                  Обычно анализ занимает от 30 до 90 секунд. Страница обновится автоматически, когда появится готовый результат.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <PipelineProgress status={analysis?.status} />
              </div>
            </div>
          </section>
        )}

        {isFailed && (
          <section className="page-section border-rose-200 bg-rose-50/80">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-rose-200 bg-white text-rose-700">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 8l8 8M16 8l-8 8" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-rose-900">Анализ завершился с ошибкой</h2>
              {analysis?.error_message && <p className="mt-3 text-sm leading-6 text-rose-700">{analysis.error_message}</p>}
              <Link to="/upload" className="btn-primary mt-6">
                Загрузить другой документ
              </Link>
            </div>
          </section>
        )}

        {isCompleted && (
          <>
            <section className="hero-panel">
              <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  {!seniorMode && <div className="section-title">Executive summary</div>}
                  <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-white md:text-[2.35rem]">
                    {seniorMode
                      ? 'Анализ завершён. Ниже — оценка документа, замечания и рекомендации.'
                      : 'Документ уже получил расчет score, логическую проверку и объяснимые замечания.'}
                  </h2>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
                    {analysis.document_summary || 'Система подготовила структурную оценку, выявила слабые места и собрала улучшения по ключевым разделам.'}
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                      <div className="text-sm text-slate-400">Общий score</div>
                      <div className="mt-2 text-3xl font-semibold text-white">{score}</div>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                      <div className="text-sm text-slate-400">Проблем найдено</div>
                      <div className="mt-2 text-3xl font-semibold text-cyan-300">{issueCount}</div>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                      <div className="text-sm text-slate-400">Связность документа</div>
                      <div className="mt-2 text-3xl font-semibold text-emerald-300">{analysis.consistency_score || 0}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Приоритет для доработки</div>
                  <div className="mt-3 text-xl font-semibold text-white">
                    {topIssue?.section_title || 'Сначала проверьте раздел рекомендаций'}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {topIssue?.explanation || primaryAction}
                  </p>
                  {!seniorMode && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <div className="nav-pill">Critical: {criticalCount}</div>
                      <div className="nav-pill">Missing: {missingSections.length}</div>
                      <div className="nav-pill">KPI ready</div>
                    </div>
                  )}
                  {seniorMode && criticalCount > 0 && (
                    <div className="mt-5 rounded-[16px] border border-rose-200 bg-rose-50/60 px-4 py-2 text-sm font-semibold text-rose-700">
                      Критичных замечаний: {criticalCount} — требуют исправления в первую очередь
                    </div>
                  )}
                </div>
              </div>
            </section>

            {seniorMode && (
              <section className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="senior-summary-card">
                  <div className="section-title text-slate-500">Что хорошо</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">Документ уже проанализирован</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Общая оценка: <strong>{score} из 100</strong>. Видно, где документ уже сильный, а где не хватает точности.
                  </p>
                </div>
                <div className="senior-summary-card">
                  <div className="section-title text-slate-500">Что исправить</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {topIssue?.section_title || 'Посмотрите основные замечания'}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {topIssue?.explanation || 'Сначала исправьте замечания с высоким приоритетом и добавьте недостающие разделы.'}
                  </p>
                </div>
                <div className="senior-summary-card">
                  <div className="section-title text-slate-500">Что делать дальше</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">Первое действие</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{primaryAction}</p>
                </div>
              </section>
            )}

            {seniorMode ? (
              /* ── ПРОСТОЙ РЕЖИМ: крупная цветная карточка с оценкой ── */
              <section className="mt-6">
                {(() => {
                  const tone = score >= 75
                    ? { border: 'border-emerald-300', bg: 'bg-emerald-50', numColor: 'text-emerald-600', label: 'Хороший документ', labelBg: 'bg-emerald-100 text-emerald-700' }
                    : score >= 50
                    ? { border: 'border-amber-300', bg: 'bg-amber-50', numColor: 'text-amber-600', label: 'Нужна доработка', labelBg: 'bg-amber-100 text-amber-700' }
                    : { border: 'border-rose-300', bg: 'bg-rose-50', numColor: 'text-rose-600', label: 'Требуется переработка', labelBg: 'bg-rose-100 text-rose-700' }
                  return (
                    <div className={`rounded-[28px] border-2 p-7 ${tone.border} ${tone.bg}`}>
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="text-center">
                          <div className={`text-7xl font-bold leading-none tabular-nums ${tone.numColor}`}>{score}</div>
                          <div className="mt-2 text-sm text-slate-500">из 100</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`inline-block rounded-full px-4 py-1.5 text-base font-bold ${tone.labelBg}`}>
                            {tone.label}
                          </span>
                          <p className="mt-3 text-lg leading-7 text-slate-700">
                            Найдено замечаний: <strong>{issueCount}</strong>
                            {criticalCount > 0 && <>, из них критичных: <strong className="text-rose-600">{criticalCount}</strong></>}.
                          </p>
                          <p className="mt-2 text-base leading-7 text-slate-600">
                            {criticalCount > 0
                              ? 'Перейдите во вкладку «Что не так» и исправьте замечания сверху вниз.'
                              : 'Перейдите во вкладку «Что исправить» — там конкретные рекомендации.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </section>
            ) : (
              /* ── ОБЫЧНЫЙ РЕЖИМ: gauge + breakdown ── */
              <section className="mt-6 card">
                <div className="mb-5">
                  <div className="section-title text-slate-500">Score breakdown</div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Декомпозиция итогового балла</h3>
                </div>
                <div className="grid gap-8 lg:grid-cols-[200px_1fr] lg:items-start">
                  <div className="flex justify-center lg:justify-start">
                    <ScoreGauge score={analysis.score} />
                  </div>
                  <ScoreBreakdown breakdown={analysis.score_breakdown} />
                </div>
              </section>
            )}

            {!seniorMode && (
              <section className="mt-6 card">
                <div className="section-title text-slate-500">Pipeline status</div>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Как система пришла к этому выводу</h3>
                <div className="mt-5">
                  <PipelineProgress status="completed" />
                </div>
              </section>
            )}

            <section className="mt-6 flex gap-2 overflow-x-auto pb-1">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                    activeTab === key
                      ? 'border-cyan-500 bg-cyan-500 text-white shadow-[0_12px_24px_rgba(6,182,212,0.22)]'
                      : 'border-slate-200 bg-white/85 text-slate-600 hover:border-cyan-200 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </section>

            {activeTab === 'overview' && (
              <section className="mt-6 space-y-6">
                {!seniorMode && (
                  <div className="page-section">
                    <LogicGraph sections={analysis.sections || []} missingSections={missingSections} />
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="card">
                    <div className="section-title text-slate-500">Структура документа</div>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Найденные и недостающие разделы</h3>
                    <div className="mt-5">
                      <SectionChecklist sections={analysis.sections || []} missingSections={missingSections} />
                    </div>
                    {missingSections.length > 0 && (
                      <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        Отсутствуют обязательные разделы: {missingSections.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <div className="section-title text-slate-500">Сводка</div>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Ключевые показатели документа</h3>
                    {analysis.document_summary && (
                      <p className="mt-4 text-sm leading-6 text-slate-600">{analysis.document_summary}</p>
                    )}
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                        <span className="text-sm text-slate-500">Логическая связность</span>
                        <span className="text-sm font-semibold text-slate-900">{analysis.consistency_score || 0} / 100</span>
                      </div>
                      <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                        <span className="text-sm text-slate-500">Всего проблем</span>
                        <span className="text-sm font-semibold text-slate-900">{issueCount}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                        <span className="text-sm text-slate-500">Критичных замечаний</span>
                        <span className="text-sm font-semibold text-rose-700">{criticalCount}</span>
                      </div>
                    </div>
                    {analysis.overall_coherence && (
                      <p className="mt-5 text-sm italic leading-6 text-slate-500">{analysis.overall_coherence}</p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'issues' && (
              <section className="mt-6 card">
                <div className="section-title text-slate-500">{seniorMode ? 'Замечания к документу' : 'Explainable AI'}</div>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Что именно не так в документе</h3>
                <div className="mt-5">
                  <IssuesList issues={analysis.issues || []} />
                </div>
              </section>
            )}

            {activeTab === 'recommendations' && (
              <section className="mt-6 space-y-6">
                <div className="card">
                  <div className="section-title text-slate-500">{seniorMode ? 'Что нужно исправить' : 'Action plan'}</div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Рекомендации по улучшению</h3>
                  <div className="mt-5">
                    <RecommendationsList recommendations={analysis.recommendations || []} />
                  </div>
                </div>
                {!seniorMode && <KpiGenerator analysis={analysis} />}
              </section>
            )}

            {activeTab === 'improved' && (
              <section className="mt-6 card">
                <div className="section-title text-slate-500">{seniorMode ? 'Улучшенная версия' : 'Improved text'}</div>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Улучшенная версия ТЗ</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Система уточняет формулировки и делает текст более измеримым, сохраняя исходный смысл документа.
                </p>
                <div className="mt-5">
                  <ImprovedDocViewer originalText={improved?.original_text} improvedText={improved?.improved_text} />
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
