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
        <section className="hero-panel hidden lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{background:'linear-gradient(135deg,#3b9eff,#0c72f5)',boxShadow:'0 4px 16px rgba(12,114,245,0.35)'}}>
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9l-6-6Z" strokeLinejoin="round"/>
                  <path d="M9 3v6h10M8 13h8M8 17h5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-2xl font-bold tracking-tight text-white" style={{letterSpacing:'-0.03em'}}>
                tz<span style={{color:'#3b9eff'}}>ex</span>
              </span>
            </div>
            <h1 className="mt-8 max-w-sm text-[2.2rem] font-bold leading-[1.15] tracking-tight text-white">
              Анализируйте ТЗ с точностью эксперта.
            </h1>
            <p className="mt-4 max-w-sm text-base leading-7 text-slate-400">
              Загрузите документ — получите оценку, замечания и готовый улучшенный текст за секунды.
            </p>
          </div>
          <div className="mt-10 grid gap-3">
            {[
              { icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z', label: 'Оценка по 5 критериям качества' },
              { icon: 'M4 7h16M4 12h10M4 17h7', label: 'RAG-анализ на реальных примерах' },
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Улучшенный текст и PDF-отчёт' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 backdrop-blur">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={icon}/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-300">{label}</span>
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
