import { useSeniorMode } from '../context/SeniorModeContext'

export default function SeniorModeToggle() {
  const { seniorMode, toggleSeniorMode } = useSeniorMode()

  return (
    <button
      type="button"
      onClick={toggleSeniorMode}
      aria-pressed={seniorMode}
      aria-label={seniorMode ? 'Выключить простой режим' : 'Включить простой режим'}
      style={{ minHeight: 'unset' }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-2xl backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
        seniorMode
          ? 'border-cyan-400/40 bg-slate-900/95 text-white shadow-[0_8px_32px_rgba(34,199,184,0.2)]'
          : 'border-slate-200 bg-white/95 text-slate-800 shadow-[0_8px_24px_rgba(15,31,53,0.12)]'
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        seniorMode ? 'bg-cyan-400/15 text-cyan-300' : 'bg-slate-100 text-slate-500'
      }`}>
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5.5 21a6.5 6.5 0 0 1 13 0" strokeLinecap="round" />
        </svg>
      </div>

      <div className="min-w-0">
        <div className={`text-sm font-bold leading-tight ${seniorMode ? 'text-white' : 'text-slate-800'}`}>
          Простой режим
        </div>
        <div className={`mt-0.5 text-sm leading-tight ${seniorMode ? 'text-cyan-300/90' : 'text-slate-500'}`}>
          {seniorMode ? 'Включён' : 'Выключить'}
        </div>
      </div>

      <div className={`ml-1 flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
        seniorMode ? 'bg-cyan-400 justify-end' : 'bg-slate-200 justify-start'
      }`}>
        <div className="h-5 w-5 rounded-full bg-white shadow-sm" />
      </div>
    </button>
  )
}
