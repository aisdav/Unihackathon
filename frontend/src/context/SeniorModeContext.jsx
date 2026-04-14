import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const SeniorModeContext = createContext(null)
const STORAGE_KEY = 'senior-mode'

export function SeniorModeProvider({ children }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.body.classList.toggle('senior-mode', enabled)
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled))
    } catch {
      // ignore storage issues in private mode or restrictive browsers
    }
  }, [enabled])

  const value = useMemo(
    () => ({
      seniorMode: enabled,
      setSeniorMode: setEnabled,
      toggleSeniorMode: () => setEnabled((prev) => !prev),
    }),
    [enabled],
  )

  return <SeniorModeContext.Provider value={value}>{children}</SeniorModeContext.Provider>
}

export function useSeniorMode() {
  const ctx = useContext(SeniorModeContext)
  if (!ctx) throw new Error('useSeniorMode must be used inside SeniorModeProvider')
  return ctx
}
