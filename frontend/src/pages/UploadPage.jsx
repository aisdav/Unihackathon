import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Link, useNavigate } from 'react-router-dom'

import { startAnalysis, uploadDocument } from '../api/client'
import { useSeniorMode } from '../context/SeniorModeContext'

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
}

function getUploadErrorMessage(rejections) {
  const firstError = rejections[0]?.errors?.[0]
  if (!firstError) return 'Неподдерживаемый формат файла.'
  if (firstError.code === 'file-too-large') return 'Файл слишком большой. Максимальный размер: 10 МБ.'
  if (firstError.code === 'file-invalid-type') return 'Поддерживаются только PDF, DOCX и TXT.'
  return firstError.message || 'Не удалось загрузить файл.'
}

function FileBadge({ file }) {
  if (!file) return null

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-900">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 3.75h6.75L20.25 9v11.25A1.75 1.75 0 0 1 18.5 22H8a3 3 0 0 1-3-3V6.75A3 3 0 0 1 8 3.75Z" />
        <path d="M14.5 3.75V9H20" />
      </svg>
      <span>{file.name}</span>
    </div>
  )
}

function FeatureCard({ title, desc }) {
  return (
    <div className="metric-card">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500">{desc}</div>
    </div>
  )
}

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [step, setStep] = useState('idle')
  const [error, setError] = useState('')
  const { seniorMode } = useSeniorMode()
  const navigate = useNavigate()

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) {
      setFile(accepted[0])
      setError('')
      setStep('idle')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (rejections) => {
      setError(getUploadErrorMessage(rejections))
    },
  })

  const handleUpload = async () => {
    if (!file) return

    setError('')
    setStep('uploading')

    try {
      const uploadRes = await uploadDocument(file)
      const docId = uploadRes.data.id
      setStep('analyzing')
      await startAnalysis(docId)
      setStep('done')
      setTimeout(() => navigate(`/analysis/${docId}`), 900)
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Ошибка при загрузке документа.'
      setError(detail)
      setStep('error')
    }
  }

  const zoneClasses = isDragActive
    ? 'border-cyan-300 bg-cyan-50/80'
    : file
      ? 'border-emerald-300 bg-emerald-50/80'
      : 'border-slate-200 bg-white/70 hover:border-cyan-300 hover:bg-cyan-50/50'

  return (
    <div className="app-shell">
      <header className="page-header px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link to="/dashboard" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 19 8 12l7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            {!seniorMode && <div className="nav-pill w-fit">Upload laboratory</div>}
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-50">Загрузка документа на анализ</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <section className="hero-panel">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              {!seniorMode && <div className="section-title">Подготовка источника</div>}
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-white md:text-[2.35rem]">
                {seniorMode
                  ? 'Загрузите файл технического задания, чтобы получить оценку и рекомендации.'
                  : 'Загружайте ТЗ в аккуратный анализатор научных требований, а не в абстрактный файловый ящик.'}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                После загрузки система выделит разделы, проверит логику документа, найдет неясные формулировки
                и подготовит улучшенную версию текста с отчетом.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="nav-pill">PDF</div>
                <div className="nav-pill">DOCX</div>
                <div className="nav-pill">TXT</div>
                <div className="nav-pill">до 10 МБ</div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Что произойдет дальше</div>
              <div className="mt-4 space-y-3">
                {[
                  'Сервис извлечет разделы и структуру документа.',
                  'RAG поднимет похожие эталонные примеры и слабые паттерны.',
                  'Вы получите score, замечания, KPI и готовый отчет.',
                ].map((item, index) => (
                  <div key={item} className="flex items-start gap-3 rounded-[18px] border border-white/8 bg-slate-950/25 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-sm font-semibold text-cyan-200">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {seniorMode && (
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="senior-summary-card">
              <div className="section-title text-slate-500">Шаг 1</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">Выберите файл</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Подходят PDF, DOCX и TXT размером до 10 МБ.
              </p>
            </div>
            <div className="senior-summary-card">
              <div className="section-title text-slate-500">Шаг 2</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">Запустите анализ</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Нажмите большую кнопку под областью загрузки. Сервис продолжит сам.
              </p>
            </div>
            <div className="senior-summary-card">
              <div className="section-title text-slate-500">Результат</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">Появится понятный отчет</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Вы увидите оценку качества, основные проблемы и конкретные рекомендации.
              </p>
            </div>
          </section>
        )}

        <section className="mt-8 page-section">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div
                {...getRootProps()}
                className={`rounded-[32px] border-2 border-dashed px-8 py-12 text-center transition-all ${zoneClasses}`}
              >
                <input {...getInputProps()} />
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-slate-200 bg-slate-50 text-slate-700 shadow-[0_18px_36px_rgba(15,31,53,0.06)]">
                  <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M12 16V7" strokeLinecap="round" />
                    <path d="M8.5 10.5 12 7l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5.75 15.5v2A2.75 2.75 0 0 0 8.5 20.25h7A2.75 2.75 0 0 0 18.25 17.5v-2" strokeLinecap="round" />
                  </svg>
                </div>

                <h3 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
                  {isDragActive ? 'Отпустите файл, чтобы загрузить его' : 'Перетащите файл сюда или нажмите для выбора'}
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                  Лучше всего загружать максимально полную версию ТЗ: с целью, задачами, KPI, сроками и ресурсами.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <span className="soft-pill">Поддержка PDF</span>
                  <span className="soft-pill">Поддержка DOCX</span>
                  <span className="soft-pill">Поддержка TXT</span>
                </div>

                {file && (
                  <div className="mt-6">
                    <FileBadge file={file} />
                    <div className="mt-2 text-sm text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} МБ
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {step === 'uploading' && (
                <div className="card mt-4">
                  <div className="flex items-center gap-3 text-cyan-700">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 3a9 9 0 1 1-6.36 2.64" strokeLinecap="round" />
                    </svg>
                    <span className="font-semibold">Документ загружается в систему.</span>
                  </div>
                </div>
              )}

              {step === 'analyzing' && (
                <div className="card mt-4">
                  <div className="flex items-center gap-3 text-cyan-700">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 3a9 9 0 1 1-6.36 2.64" strokeLinecap="round" />
                    </svg>
                    <span className="font-semibold">AI-анализ запущен. Переходим к результатам.</span>
                  </div>
                </div>
              )}

              {step === 'done' && (
                <div className="card mt-4 border-emerald-200 bg-emerald-50">
                  <div className="flex items-center gap-3 text-emerald-700">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 10.5 8 14.5 16 6.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-semibold">Документ принят. Результаты откроются автоматически.</span>
                  </div>
                </div>
              )}

              {file && step === 'idle' && (
                <button onClick={handleUpload} className="btn-primary mt-6 w-full py-4 text-base">
                  Загрузить и запустить анализ
                </button>
              )}
            </div>

            <div className="space-y-4">
              <FeatureCard
                title="Структурный анализ"
                desc="Система проверяет, есть ли в документе обязательные разделы и как они связаны между собой."
              />
              <FeatureCard
                title="Оценка научной логики"
                desc="Проверяются цель, задачи, KPI, ресурсы и ожидаемые результаты, а также их согласованность."
              />
              <FeatureCard
                title="Объяснимые рекомендации"
                desc="Каждое замечание подается в формате: проблема, почему это плохо и как исправить."
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
