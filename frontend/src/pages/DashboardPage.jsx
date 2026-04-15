import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { getDocuments } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSeniorMode } from '../context/SeniorModeContext'

function DocumentIcon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-cyan-700">
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 3.75h6.75L20.25 9v11.25A1.75 1.75 0 0 1 18.5 22H8a3 3 0 0 1-3-3V6.75A3 3 0 0 1 8 3.75Z" />
        <path d="M14.5 3.75V9H20" />
      </svg>
    </div>
  )
}

function ScoreBadge({ score }) {
  if (score == null) return <span className="text-sm text-slate-400">Нет оценки</span>

  const color =
    score >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
    'bg-rose-50 text-rose-700 border-rose-200'

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${color}`}>
      {Math.round(score)} / 100
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Ожидание', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    running: { label: 'Анализ', cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    completed: { label: 'Готово', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    failed: { label: 'Ошибка', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  }

  const state = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' }

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${state.cls}`}>
      {state.label}
    </span>
  )
}

function MetricCard({ value, label, tone = 'default' }) {
  const toneMap = {
    default: 'text-slate-900',
    accent: 'text-cyan-700',
    success: 'text-emerald-700',
  }

  return (
    <div className="metric-card">
      <div className={`text-4xl font-bold tracking-tight ${toneMap[tone] || toneMap.default}`}>{value}</div>
      <div className="mt-2 text-sm text-slate-500">{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const { user, signOut } = useAuth()
  const { seniorMode } = useSeniorMode()
  const navigate = useNavigate()

  useEffect(() => {
    getDocuments()
      .then((res) => setDocs(res.data.documents || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const analyzedDocs = docs.filter((doc) => doc.analysis_score != null)
  const averageScore = analyzedDocs.length > 0
    ? Math.round(analyzedDocs.reduce((sum, doc) => sum + doc.analysis_score, 0) / analyzedDocs.length)
    : '—'
  const completedCount = docs.filter((doc) => doc.analysis_status === 'completed').length
  const lastDocument = docs[0]

  return (
    <div className="app-shell">
      <header className="page-header px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{background:'linear-gradient(135deg,#3b9eff,#0c72f5)',boxShadow:'0 4px 16px rgba(12,114,245,0.35)'}}>
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9l-6-6Z" strokeLinejoin="round"/>
                <path d="M9 3v6h10M8 13h8M8 17h5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-bold tracking-tight text-white" style={{letterSpacing:'-0.03em'}}>
                tz<span style={{color:'#3b9eff'}}>ex</span>
              </span>
              {!seniorMode && (
                <span className="hidden text-xs font-medium text-slate-400 md:block">AI-анализ технических заданий</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right text-sm text-slate-300 md:block">
              <div>{user?.name || user?.email}</div>
            </div>
            <Link to="/rag" className="btn-secondary hidden md:inline-flex">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h16M4 10h16M4 14h10M4 18h7" strokeLinecap="round"/>
              </svg>
              База RAG
            </Link>
            <button onClick={signOut} className="btn-secondary">
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {seniorMode ? (
          /* ── ПРОСТОЙ РЕЖИМ: лёгкий белый блок без сложного дизайна ── */
          <section className="rounded-[28px] border-2 border-slate-200 bg-white p-8 shadow-[0_16px_40px_rgba(15,31,53,0.07)]">
            <h2 className="text-3xl font-bold leading-tight text-slate-900">
              Добро пожаловать{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
            </h2>
            <p className="mt-3 text-lg leading-8 text-slate-600">
              Здесь хранятся ваши технические задания. Загрузите документ, чтобы получить оценку и список замечаний.
            </p>
            <div className="mt-7 flex flex-wrap gap-4">
              <Link to="/upload" className="btn-primary px-8 py-4 text-base">
                Загрузить документ
              </Link>
              {lastDocument && (
                <button onClick={() => navigate(`/analysis/${lastDocument.id}`)} className="btn-secondary px-8 py-4 text-base">
                  Открыть последний результат
                </button>
              )}
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { value: docs.length, label: 'Документов загружено', color: 'text-slate-900' },
                { value: averageScore, label: 'Средний балл', color: 'text-cyan-700' },
                { value: completedCount, label: 'Проверок завершено', color: 'text-emerald-700' },
              ].map(({ value, label, color }) => (
                <div key={label} className="rounded-[20px] border border-slate-200 bg-slate-50 p-5 text-center">
                  <div className={`text-4xl font-bold ${color}`}>{value}</div>
                  <div className="mt-2 text-sm font-medium text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          /* ── ОБЫЧНЫЙ РЕЖИМ ── */
          <section className="hero-panel">
            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
              <div>
                <div className="section-title mb-1 text-blue-400/80">Рабочая панель</div>
                <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white md:text-[2.2rem]" style={{letterSpacing:'-0.02em'}}>
                  Загрузите ТЗ — tzex найдёт всё, что мешает проекту стартовать.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-400">
                  Оценка структуры, ясности и логики документа за секунды.
                  Конкретные замечания, рекомендации и готовый улучшенный текст.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/upload" className="btn-primary">Загрузить новое ТЗ</Link>
                  {lastDocument && (
                    <button onClick={() => navigate(`/analysis/${lastDocument.id}`)} className="btn-secondary">
                      Открыть последний анализ
                    </button>
                  )}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-300">Текущий контур качества</div>
                <div className="mt-4 grid gap-3">
                  {[
                    { label: 'Документов в системе', value: docs.length, cls: 'text-white' },
                    { label: 'Средний балл', value: averageScore, cls: 'text-cyan-300' },
                    { label: 'Завершено проверок', value: completedCount, cls: 'text-emerald-300' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-medium text-slate-300">{label}</div>
                      <div className={`mt-2 text-3xl font-semibold ${cls}`}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {!seniorMode && (
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <MetricCard value={docs.length} label="документов в рабочей области" />
            <MetricCard value={completedCount} label="успешно завершенных анализов" tone="success" />
            <MetricCard value={averageScore} label="средний score по готовым документам" tone="accent" />
          </section>
        )}

        <section className="mt-8 page-section">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="section-title text-slate-500">Документы</div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">История проверок</h3>
            </div>
            <Link to="/upload" className="btn-primary">
              Добавить документ
            </Link>
          </div>

          {loading ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-6 py-16 text-center text-slate-500">
              Загружаем список документов...
            </div>
          ) : docs.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-cyan-200 bg-cyan-50/60 px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-200 bg-white text-cyan-700">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 3.75h6.75L20.25 9v11.25A1.75 1.75 0 0 1 18.5 22H8a3 3 0 0 1-3-3V6.75A3 3 0 0 1 8 3.75Z" />
                  <path d="M14.5 3.75V9H20" />
                </svg>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">Документов пока нет</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                Загрузите техническое задание в формате PDF, DOCX или TXT, чтобы получить score, пояснения и рекомендации.
              </p>
              <Link to="/upload" className="btn-primary mt-6">
                Загрузить первый документ
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  className="w-full rounded-[26px] border border-slate-200/80 bg-white/90 p-5 text-left shadow-[0_14px_34px_rgba(15,31,53,0.06)] transition-all hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_18px_42px_rgba(15,31,53,0.08)]"
                  onClick={() => navigate(`/analysis/${doc.id}`)}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <DocumentIcon />
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold text-slate-900">{doc.filename}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {new Date(doc.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="soft-pill">{String(doc.file_type || '').toUpperCase()}</span>
                          {doc.has_analysis && <StatusBadge status={doc.analysis_status} />}
                        </div>
                        {seniorMode && (
                          <div className="mt-3 text-sm leading-6 text-slate-600">
                            {doc.analysis_status === 'completed'
                              ? 'Откройте карточку, чтобы посмотреть оценку, замечания и готовый отчет.'
                              : 'Откройте карточку, чтобы посмотреть текущий статус анализа.'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 lg:justify-end">
                      <ScoreBadge score={doc.analysis_score} />
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M9 5.5 15.5 12 9 18.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
