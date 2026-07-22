import { NavLink, Outlet } from 'react-router-dom'
import { UNLOCK_KEY } from '../lib/pinGateStorage'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/expenses', label: 'Expenses', icon: '🧾' },
  { to: '/income', label: 'Income', icon: '📈' },
  { to: '/credit-cards', label: 'Cards', icon: '💳' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-surface text-slate-100">
      <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-2xl">💰</span> Finance Tracker
          </h1>
          <button
            onClick={() => {
              localStorage.removeItem(UNLOCK_KEY)
              window.location.reload()
            }}
            className="tap-shrink text-sm text-slate-400 hover:text-slate-100 px-3 py-1.5 rounded-full border border-white/10"
          >
            🔒 Lock
          </button>
        </div>
        <nav className="hidden md:flex max-w-5xl mx-auto px-4 gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `tap-shrink flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 ${
                  isActive
                    ? 'border-brand-400 text-brand-400'
                    : 'border-transparent text-slate-400 hover:text-slate-100'
                }`
              }
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface-2/95 backdrop-blur border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-5xl mx-auto grid grid-cols-5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `tap-shrink flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  isActive ? 'text-brand-400' : 'text-slate-500'
                }`
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
