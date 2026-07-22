import { createContext, useContext, useState, type ReactNode } from 'react'
import { peso } from './format'

const KEY = 'finance_tracker_privacy_hidden'

interface PrivacyContextValue {
  hidden: boolean
  toggle: () => void
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null)

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(() => localStorage.getItem(KEY) === 'true')

  function toggle() {
    setHidden((prev) => {
      const next = !prev
      localStorage.setItem(KEY, String(next))
      return next
    })
  }

  return <PrivacyContext.Provider value={{ hidden, toggle }}>{children}</PrivacyContext.Provider>
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider')
  return ctx
}

/** Returns a peso-formatting function that respects the privacy toggle. */
export function useMoneyFormatter() {
  const { hidden } = usePrivacy()
  return (amount: number) => (hidden ? '₱ ••••••' : peso(amount))
}
