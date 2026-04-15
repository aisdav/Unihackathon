import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addRagExample, deleteRagExample, getRagExamples, getRagStats } from '../api/client'

const SECTION_TYPES = [
  { value: 'purpose',          label: 'Цель' },
  { value: 'tasks',            label: 'Задачи' },
  { value: 'kpi',              label: 'KPI' },
  { value: 'timeline',         label: 'Сроки' },
  { value: 'resources',        label: 'Ресурсы' },
  { value: 'expected_results', label: 'Ожидаемые результаты' },
  { value: 'methodology',      label: 'Методология' },
  { value: 'background',       label: 'Актуальность' },
  { value: 'requirements',     label: 'Требования' },
  { value: 'other',            label: 'Прочее' },
]

const QUALITY_LABELS = { high: 'Хороший пример', low: 'Плохой пример' }

const QUALITY_STYLE = {
  high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  low:  'bg-rose-50 text-rose-700 border-rose-200',
}

const EMPTY_FORM = {
  text: '', section_type: 'purpose', quality: 'high', annotation: '', issue: '', custom_id: '',
}

export default function RagPage() {
  const [examples, setExamples] = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [filterQuality, setFilterQuality] = useState('all')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [exRes, stRes] = await Promise.all([getRagExamples(200), getRagStats()])
      setExamples(exRes.data.items || [])
      setStats(stRes.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Не удалось загрузить базу примеров.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaveError('')
    setSaving(true)
    try {
      await addRagExample(form)
      setForm(EMPTY_FORM)
      setShowForm(false)
      await load()
    } catch (e) {
      setSaveError(e.response?.data?.detail || 'Не удалось добавить пример.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот пример из базы RAG?')) return
    setDeletingId(id)
    try {
      await deleteRagExample(id)
      setExamples((prev) => prev.filter((ex) => ex.id !== id))
      setStats((prev) => prev ? { ...prev, total: (prev.total || 1) - 1 } : prev)
    } catch (e) {
      alert(e.response?.data?.detail || 'Не удалось удалить.')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = examples.filter((ex) => {
    if (filterType !== 'all' && ex.section_type !== filterType) return false
    if (filterQuality !== 'all' && ex.quality !== filterQuality) return false
    if (search) {
      const q = search.toLowerCase()
      return ex.text.toLowerCase().includes(q) || ex.annotation.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="app-shell">
      <header className="page-header px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 19 8 12l7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div>
              <div className="nav-pill w-fit">RAG knowledge base</div>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-50">
                База примеров для AI-анализа
              </h1>
            </div>
          </div>
          <button onClick={() => { setShowForm(true); setSaveError('') }} className="btn-primary">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Добавить пример
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">

        {/* Статистика */}
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Всего примеров', value: stats?.total ?? '—', cls: 'text-slate-900' },
            { label: 'Хороших примеров', value: examples.filter(e => e.quality === 'high').length || '—', cls: 'text-emerald-700' },
            { label: 'Плохих примеров',  value: examples.filter(e => e.quality === 'low').length  || '—', cls: 'text-rose-700' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="metric-card">
              <div className={`text-4xl font-bold ${cls}`}>{value}</div>
              <div className="mt-2 text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </section>

        {/* Форма добавления */}
        {showForm && (
          <section className="card">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Новый пример</h2>
              <button onClick={() => setShowForm(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Тип раздела</label>
                  <select
                    value={form.section_type}
                    onChange={(e) => setForm({ ...form, section_type: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  >
                    {SECTION_TYPES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Качество</label>
                  <select
                    value={form.quality}
                    onChange={(e) => setForm({ ...form, quality: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  >
                    <option value="high">Хороший пример</option>
                    <option value="low">Плохой пример</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Текст примера</label>
                <textarea
                  required
                  rows={4}
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  placeholder="Вставьте текст раздела ТЗ..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Аннотация — почему это хороший/плохой пример</label>
                <input
                  required
                  type="text"
                  value={form.annotation}
                  onChange={(e) => setForm({ ...form, annotation: e.target.value })}
                  placeholder="Например: конкретная цель с измеримым KPI"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />
              </div>

              {form.quality === 'low' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Тип проблемы (необязательно)</label>
                  <input
                    type="text"
                    value={form.issue}
                    onChange={(e) => setForm({ ...form, issue: e.target.value })}
                    placeholder="vague_goal, missing_kpi, ..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">ID записи (необязательно)</label>
                <input
                  type="text"
                  value={form.custom_id}
                  onChange={(e) => setForm({ ...form, custom_id: e.target.value })}
                  placeholder="Оставьте пустым — сгенерируется автоматически"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />
              </div>

              {saveError && (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{saveError}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving} className="btn-primary px-8">
                  {saving ? 'Сохраняем...' : 'Добавить в базу'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Отмена
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Список примеров */}
        <section className="page-section">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mr-auto">
              Примеры <span className="text-slate-400">({filtered.length})</span>
            </h2>

            {/* Поиск */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по тексту..."
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 w-52"
            />

            {/* Фильтр по типу */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-cyan-400"
            >
              <option value="all">Все разделы</option>
              {SECTION_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Фильтр по качеству */}
            <select
              value={filterQuality}
              onChange={(e) => setFilterQuality(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-cyan-400"
            >
              <option value="all">Все</option>
              <option value="high">Хорошие</option>
              <option value="low">Плохие</option>
            </select>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500">Загружаем базу примеров...</div>
          ) : error ? (
            <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">Примеров не найдено</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((ex) => (
                <div key={ex.id} className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_4px_16px_rgba(15,31,53,0.04)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${QUALITY_STYLE[ex.quality] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {QUALITY_LABELS[ex.quality] || ex.quality}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {SECTION_TYPES.find(s => s.value === ex.section_type)?.label || ex.section_type}
                      </span>
                      {ex.issue && (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          {ex.issue}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-mono">{ex.id}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(ex.id)}
                      disabled={deletingId === ex.id}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-40"
                      title="Удалить"
                    >
                      {deletingId === ex.id ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 3a9 9 0 1 1-6.36 2.64" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-800 line-clamp-3">{ex.text}</p>
                  {ex.annotation && (
                    <p className="mt-2 text-xs leading-5 text-slate-500 italic">{ex.annotation}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
