import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { login } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await login(form)
      signIn(res.data.access_token, res.data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка входа. Проверьте введенные данные.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell flex items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hero-panel hidden lg:block">
          <div className="section-title">Научная платформа</div>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight">
            Вход в AI-платформу для анализа технических заданий и исследовательской логики.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            Сервис помогает увидеть слабые формулировки, недостающие разделы, разрывы между целью и KPI,
            а также готовит понятный отчет для доработки документа.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              'Оценка структуры и полноты документа.',
              'RAG-сопоставление с эталонными примерами.',
              'Explainable AI с понятными рекомендациями.',
            ].map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/5 p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-sm font-semibold text-cyan-200">
                  {index + 1}
                </div>
                <div className="text-sm leading-6 text-slate-300">{item}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card w-full max-w-xl justify-self-center">
          <div className="mb-8">
            <div className="nav-pill w-fit !bg-cyan-50 !text-cyan-700 !border-cyan-100">Авторизация</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Войти в рабочую область</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Используйте email и пароль, чтобы открыть документы, результаты анализа и чат по ТЗ.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Пароль</label>
              <input
                type="password"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Введите пароль"
              />
            </div>

            {error && (
              <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
              {loading ? 'Выполняем вход...' : 'Войти'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Нет аккаунта?{' '}
            <Link to="/register" className="font-semibold text-cyan-700 hover:text-cyan-800">
              Зарегистрироваться
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
