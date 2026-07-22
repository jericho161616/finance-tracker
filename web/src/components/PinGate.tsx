import { useState, type FormEvent, type ReactNode } from 'react'
import { UNLOCK_KEY } from '../lib/pinGateStorage'

export default function PinGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(UNLOCK_KEY) === 'true')
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const requiredPin = import.meta.env.VITE_APP_PIN

  if (!requiredPin) {
    return <>{children}</>
  }

  if (unlocked) {
    return <>{children}</>
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (pin === requiredPin) {
      localStorage.setItem(UNLOCK_KEY, 'true')
      setUnlocked(true)
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-xs bg-surface-2 rounded-3xl shadow-xl border border-white/5 p-8 text-center animate-in">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-brand-900/40">
          🔒
        </div>
        <h1 className="text-xl font-semibold text-slate-100 mb-1">Finance Tracker</h1>
        <p className="text-slate-400 text-sm mb-6">Enter your PIN to continue</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value)
              setError(false)
            }}
            className="w-full text-center tracking-[0.5em] rounded-xl border border-white/10 bg-surface-3 px-3 py-3 text-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          {error && <p className="text-sm text-red-400">Incorrect PIN</p>}
          <button
            type="submit"
            className="tap-shrink w-full bg-brand-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-500 shadow-lg shadow-brand-900/30"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}
