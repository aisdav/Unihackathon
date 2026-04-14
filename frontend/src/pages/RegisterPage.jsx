import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { register } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов.')
      return
    }

    setLoading(true)
    try {
      const res = await register(form)
      signIn(res.data.access_token, res.data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось завершить регистрацию.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell flex items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hero-panel hidden lg:block">
          <div className="section-title">Регистрация</div>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight">
            Создайте рабочий аккаунт и соберите единое пространство для анализа научных ТЗ.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            После регистрации можно загружать документы, сравнивать их качество, получать объяснимые замечания
            и проверять, насколько цель, задачи и KPI связаны между собой.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              'Личный кабинет с историей проверок.',
              'Отдельный отчет по каждому документу.',
              'Простой режим для пользователей старшего возраста.',
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
            <div className="nav-pill w-fit !bg-cyan-50 !text-cyan-700 !border-cyan-100">Регистрация</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Создать аккаунт</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Заполните данные один раз, чтобы работать с анализом документов и результатами в одном месте.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Имя</label>
              <input
                type="text"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Имя и фамилия"
              />
            </div>

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
                placeholder="Минимум 6 символов"
              />
            </div>

            {error && (
              <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
              {loading ? 'Создаем аккаунт...' : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="font-semibold text-cyan-700 hover:text-cyan-800">
              Войти
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
