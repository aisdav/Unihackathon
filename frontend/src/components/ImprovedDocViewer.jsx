import { useMemo, useState } from 'react'
import ReactDiffViewer from 'react-diff-viewer-continued'

const VAGUE_PATTERNS = [
  /улучшить качество/gi,
  /повысить эффективность/gi,
  /в разумные сроки/gi,
  /при необходимости/gi,
  /высокое качество/gi,
  /эффективн\w+/gi,
  /оптимальн\w+/gi,
]

function highlightVagueText(text = '') {
  let result = text
  VAGUE_PATTERNS.forEach((p) => {
    result = result.replace(p, (m) => `[[VAGUE]]${m}[[/VAGUE]]`)
  })
  return result
}

function renderHighlighted(text = '') {
  return highlightVagueText(text)
    .split(/(\[\[VAGUE\]\].*?\[\[\/VAGUE\]\])/g)
    .map((part, i) => {
      if (part.startsWith('[[VAGUE]]')) {
        const clean = part.replace('[[VAGUE]]', '').replace('[[/VAGUE]]', '')
        return (
          <mark key={i} className="rounded border border-rose-200 bg-rose-100 px-0.5 text-rose-700" title="Расплывчатая формулировка">
            {clean}
          </mark>
        )
      }
      return <span key={i}>{part}</span>
    })
}

const TABS = [
  { key: 'diff', label: 'Изменения' },
  { key: 'improved', label: 'Улучшенный' },
  { key: 'original', label: 'Оригинал' },
]

function downloadTxt(text, filename = 'improved_tz.txt') {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ImprovedDocViewer({ originalText, improvedText }) {
  const [tab, setTab] = useState('diff')
  const highlightedOriginal = useMemo(() => renderHighlighted(originalText || ''), [originalText])
  const highlightedImproved = useMemo(() => renderHighlighted(improvedText || ''), [improvedText])

  if (!improvedText) {
    return (
      <div className="rounded-[18px] border border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400">
        Улучшенный текст недоступен
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Anti-vague detector:</span> расплывчатые формулировки подсвечены красным.
          Их нужно заменить на измеримые критерии.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-all ${
              tab === key
                ? 'border-cyan-500 bg-cyan-500 text-white shadow-[0_8px_18px_rgba(6,182,212,0.22)]'
                : 'border-slate-200 bg-white/85 text-slate-600 hover:border-cyan-200 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => downloadTxt(improvedText)}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-1.5 text-sm font-semibold text-slate-600 transition-all hover:border-cyan-200 hover:text-slate-900"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 4v10M8 10l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 18.5h14" strokeLinecap="round" />
          </svg>
          Скачать TXT
        </button>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-slate-200 text-sm">
        {tab === 'diff' && (
          <ReactDiffViewer
            oldValue={originalText || ''}
            newValue={improvedText}
            splitView={false}
            useDarkTheme={false}
            hideLineNumbers={false}
            showDiffOnly={false}
            styles={{
              variables: {
                light: {
                  diffViewerBackground: '#fff',
                  addedBackground: '#d1fae5',
                  addedColor: '#065f46',
                  removedBackground: '#fee2e2',
                  removedColor: '#991b1b',
                  wordAddedBackground: '#a7f3d0',
                  wordRemovedBackground: '#fca5a5',
                },
              },
            }}
          />
        )}
        {tab === 'original' && (
          <pre className="max-h-[500px] overflow-y-auto whitespace-pre-wrap bg-white p-5 font-sans leading-relaxed text-slate-700">
            {highlightedOriginal}
          </pre>
        )}
        {tab === 'improved' && (
          <pre className="max-h-[500px] overflow-y-auto whitespace-pre-wrap bg-emerald-50/50 p-5 font-sans leading-relaxed text-slate-700">
            {highlightedImproved}
          </pre>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
        <div className="rounded-[12px] border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
          Плохо: «улучшить качество», «повысить эффективность»
        </div>
        <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
          Хорошо: «повысить точность до 95%», «снизить время до 30 с»
        </div>
      </div>
    </div>
  )
}
