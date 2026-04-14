import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getChatHistory, getDocument } from '../api/client'
import { useSeniorMode } from '../context/SeniorModeContext'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

function Avatar({ role }) {
  const isUser = role === 'user'

  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
      isUser
        ? 'border-slate-200 bg-slate-100 text-slate-700'
        : 'border-cyan-200 bg-cyan-50 text-cyan-700'
    }`}>
      {isUser ? (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
        </svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 4h6l4 4v7a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8l4-4Z" />
          <path d="M9 14h6" strokeLinecap="round" />
          <path d="M10 10.5h.01M14 10.5h.01" strokeLinecap="round" />
        </svg>
      )}
    </div>
  )
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`mb-5 flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <Avatar role="assistant" />}

      <div
        className={`max-w-[80%] rounded-[24px] px-4 py-3 text-sm leading-7 shadow-[0_14px_34px_rgba(15,31,53,0.06)] ${
          isUser
            ? 'rounded-br-md bg-cyan-600 text-white'
            : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
        }`}
      >
        <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
        {msg.created_at && (
          <div className={`mt-2 text-xs ${isUser ? 'text-cyan-100' : 'text-slate-400'}`}>
            {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {isUser && <Avatar role="user" />}
    </div>
  )
}

function TypingBubble({ content }) {
  return (
    <div className="mb-5 flex items-end gap-3">
      <Avatar role="assistant" />
      <div className="max-w-[80%] rounded-[24px] rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-[0_14px_34px_rgba(15,31,53,0.06)]">
        {content ? (
          <pre className="whitespace-pre-wrap font-sans">{content}</pre>
        ) : (
          <div className="flex items-center gap-1 py-1">
            <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '120ms' }} />
            <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '240ms' }} />
          </div>
        )}
      </div>
    </div>
  )
}

const QUICK_QUESTIONS = [
  'Какие главные проблемы в этом ТЗ?',
  'Как усилить раздел KPI?',
  'Что нужно добавить для соответствия требованиям?',
  'Объясни найденные противоречия.',
]

const SENIOR_QUESTIONS = [
  'Объясни простыми словами, что не так с документом.',
  'Что исправить в первую очередь?',
  'Сделай короткий список действий.',
]

export default function ChatPage() {
  const { docId } = useParams()
  const { seniorMode } = useSeniorMode()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [docName, setDocName] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    Promise.all([getChatHistory(docId), getDocument(docId)])
      .then(([historyRes, docRes]) => {
        setMessages(historyRes.data.messages || [])
        setDocName(docRes.data.filename || `Документ #${docId}`)
      })
      .catch(console.error)
  }, [docId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const sendMessage = useCallback(async (text) => {
    const content = text.trim()
    if (!content || streaming) return

    setInput('')
    const userMsg = { role: 'user', content, created_at: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setStreaming(true)
    setStreamingContent('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${API_BASE}/chat/${docId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let assistantError = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          try {
            const parsed = JSON.parse(raw)
            if (parsed.token) {
              accumulated += parsed.token
              setStreamingContent(accumulated)
            }
            if (parsed.error) assistantError = parsed.error
            if (parsed.done) break
          } catch {
            // ignore malformed partial events
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: assistantError || accumulated || 'Не удалось получить ответ от AI-сервиса.',
          created_at: new Date().toISOString(),
        },
      ])
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Произошла ошибка. Попробуйте отправить запрос еще раз.',
            created_at: new Date().toISOString(),
          },
        ])
      }
    } finally {
      setStreaming(false)
      setStreamingContent('')
      abortRef.current = null
      inputRef.current?.focus()
    }
  }, [docId, token, streaming])

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const quickQuestions = seniorMode ? SENIOR_QUESTIONS : QUICK_QUESTIONS

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <header className="page-header px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link to={`/analysis/${docId}`} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 19 8 12l7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div className="min-w-0">
              {!seniorMode && <div className="nav-pill w-fit">Document chat</div>}
              <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-slate-50">Чат по документу</h1>
              <div className="mt-1 truncate text-sm text-slate-400">{docName}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
        {seniorMode && (
          <section className="mb-6 senior-summary-card">
            <div className="section-title text-slate-500">Простой режим</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">Можно задавать короткие вопросы простыми словами</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Например: что исправить в первую очередь, объясни проще или сделай короткий список действий.
            </p>
          </section>
        )}

        <section className="page-section flex flex-1 flex-col">
          {messages.length === 0 && !streaming ? (
            <div className="flex flex-1 flex-col justify-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-cyan-200 bg-cyan-50 text-cyan-700">
                <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 4h6l4 4v7a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8l4-4Z" />
                  <path d="M9 14h6" strokeLinecap="round" />
                  <path d="M10 10.5h.01M14 10.5h.01" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-2xl font-semibold text-slate-900">AI-ассистент по вашему ТЗ</h2>
              <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-slate-500">
                {seniorMode
                  ? 'Выберите готовый вопрос или напишите коротко, что хотите понять по документу.'
                  : 'Задайте вопрос по документу или воспользуйтесь быстрыми сценариями ниже.'}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {quickQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => sendMessage(question)}
                    className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left text-sm leading-6 text-slate-700 shadow-[0_10px_24px_rgba(15,31,53,0.04)] transition-all hover:-translate-y-0.5 hover:border-cyan-200 hover:text-slate-900"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1">
              {messages.map((msg, index) => (
                <MessageBubble key={index} msg={msg} />
              ))}

              {streaming && <TypingBubble content={streamingContent} />}

              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <div className="mt-6">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={seniorMode ? 'Напишите вопрос простыми словами...' : 'Задайте вопрос о документе...'}
              disabled={streaming}
              className="flex-1 rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-50"
            />
            <button type="submit" disabled={!input.trim() || streaming} className="btn-primary min-w-[72px] px-5">
              {streaming ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3a9 9 0 1 1-6.36 2.64" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 12h12" strokeLinecap="round" />
                  <path d="m12 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
