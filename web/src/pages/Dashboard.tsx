import { useEffect, useState } from 'react'
import { api, type CardOutstanding, type Category, type CreditCard, type Expense, type Income } from '../lib/api'
import { peso } from '../lib/format'

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [income, setIncome] = useState<Income[]>([])
  const [cards, setCards] = useState<CreditCard[]>([])
  const [outstanding, setOutstanding] = useState<CardOutstanding[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    Promise.all([
      api.expenses.list(),
      api.income.list(),
      api.creditCards.list(),
      api.outstanding.list(),
      api.categories.list(),
    ]).then(([e, i, c, o, cat]) => {
      setExpenses(e)
      setIncome(i)
      setCards(c)
      setOutstanding(o)
      setCategories(cat)
    })
  }, [])

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Uncategorized'

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0)
  const totalOutstanding = outstanding.reduce((sum, o) => sum + (o.outstanding_balance ?? 0), 0)
  const netBalance = totalIncome - totalExpenses

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    const key = e.category_id ?? 'uncategorized'
    acc[key] = (acc[key] ?? 0) + e.amount
    return acc
  }, {})

  return (
    <div className="space-y-5 animate-in">
      <div className="rounded-3xl p-6 bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-900 shadow-lg shadow-brand-900/30 text-white">
        <p className="text-brand-100/80 text-sm">Net Balance</p>
        <p className="text-4xl font-bold tracking-tight mt-1">{peso(netBalance)}</p>
        <div className="flex gap-2 mt-5">
          <span className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" /> Income {peso(totalIncome)}
          </span>
          <span className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-300" /> Expenses {peso(totalExpenses)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Credit Card Debt" value={peso(totalOutstanding)} accent="text-amber-400" />
        <Stat label="Cards Tracked" value={String(cards.length)} accent="text-brand-400" />
      </div>

      <section className="bg-surface-2 rounded-2xl border border-white/5 p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">💳 Credit Cards</h2>
        <div className="space-y-4">
          {cards.map((c) => {
            const o = outstanding.find((x) => x.credit_card_id === c.id)
            const bal = o?.outstanding_balance ?? 0
            const util = c.credit_limit > 0 ? Math.min(100, Math.max(0, (bal / c.credit_limit) * 100)) : 0
            return (
              <div key={c.id} className="text-sm">
                <div className="flex justify-between mb-1.5">
                  <span className="font-medium text-slate-200">{c.bank_name}</span>
                  <span className="text-slate-400">{peso(bal)} outstanding</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${util > 80 ? 'bg-red-500' : util > 50 ? 'bg-amber-400' : 'bg-brand-500'}`}
                    style={{ width: `${util}%` }}
                  />
                </div>
              </div>
            )
          })}
          {cards.length === 0 && <p className="text-sm text-slate-500">No credit cards yet.</p>}
        </div>
      </section>

      <section className="bg-surface-2 rounded-2xl border border-white/5 p-5">
        <h2 className="font-semibold mb-4">Spending Overview</h2>
        {Object.keys(byCategory).length === 0 ? (
          <p className="text-sm text-slate-500">No expenses logged yet.</p>
        ) : (
          <ul className="space-y-3">
            {Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([catId, amt]) => (
                <li key={catId} className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">
                    {catId === 'uncategorized' ? 'Uncategorized' : categoryName(catId)}
                  </span>
                  <span className="font-medium text-slate-100">{peso(amt)}</span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-surface-2 rounded-2xl border border-white/5 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${accent}`}>{value}</p>
    </div>
  )
}
