import { NavLink, Outlet } from 'react-router-dom'
import { UNLOCK_KEY } from '../lib/pinGateStorage'

const navItems = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/expenses', label: '🧾 Expenses' },
  { to: '/income', label: '📈 Income' },
  { to: '/credit-cards', label: '💳 Credit Cards' },
  { to: '/settings', label: '⚙️ Settings' },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">💰 Finance Tracker</h1>
          <button
            onClick={() => {
              localStorage.removeItem(UNLOCK_KEY)
              window.location.reload()
            }}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Lock
          </button>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
