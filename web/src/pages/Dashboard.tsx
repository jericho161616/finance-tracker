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

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    const key = e.category_id ?? 'uncategorized'
    acc[key] = (acc[key] ?? 0) + e.amount
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Total Income" value={peso(totalIncome)} color="text-emerald-600" />
        <Stat label="Total Expenses" value={peso(totalExpenses)} color="text-red-600" />
        <Stat label="Net Balance" value={peso(totalIncome - totalExpenses)} color="text-slate-900" />
        <Stat label="Credit Card Debt" value={peso(totalOutstanding)} color="text-amber-600" />
      </div>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3">💳 Credit Cards</h2>
        <div className="space-y-3">
          {cards.map((c) => {
            const o = outstanding.find((x) => x.credit_card_id === c.id)
            const bal = o?.outstanding_balance ?? 0
            const util = c.credit_limit > 0 ? Math.min(100, Math.max(0, (bal / c.credit_limit) * 100)) : 0
            return (
              <div key={c.id} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 font-medium text-slate-800">{c.bank_name}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${util > 80 ? 'bg-red-500' : util > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${util}%` }}
                  />
                </div>
                <span className="w-32 shrink-0 text-right text-slate-500">{peso(bal)} outstanding</span>
              </div>
            )
          })}
          {cards.length === 0 && <p className="text-sm text-slate-400">No credit cards yet.</p>}
        </div>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Spending Overview</h2>
        {Object.keys(byCategory).length === 0 ? (
          <p className="text-sm text-slate-400">No expenses logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([catId, amt]) => (
                <li key={catId} className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    {catId === 'uncategorized' ? 'Uncategorized' : categoryName(catId)}
                  </span>
                  <span className="font-medium text-slate-900">{peso(amt)}</span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  )
}
