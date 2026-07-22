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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-xs bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">🔒 Finance Tracker</h1>
        <p className="text-slate-500 text-sm mb-6">Enter your PIN to continue</p>
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
            className="w-full text-center tracking-widest rounded-md border border-slate-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-sm text-red-600">Incorrect PIN</p>}
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white rounded-md py-2 text-sm font-medium hover:bg-indigo-700"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}
