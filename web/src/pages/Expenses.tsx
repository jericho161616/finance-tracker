import { useEffect, useState } from 'react'
import { api, type Account, type Category, type CreditCard, type Expense } from '../lib/api'
import { peso } from '../lib/format'
import { card, input, button, iconButton, listItem } from '../lib/ui'

const PAYMENT_METHODS = ['cash', 'debit', 'credit_card', 'ewallet', 'bank_transfer', 'other'] as const

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cards, setCards] = useState<CreditCard[]>([])

  const [amount, setAmount] = useState<number>(0)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [categoryId, setCategoryId] = useState('')
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>('cash')
  const [cardId, setCardId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [description, setDescription] = useState('')

  async function refresh() {
    setExpenses(await api.expenses.list())
    setCategories((await api.categories.list()).filter((c) => c.kind === 'expense'))
    setAccounts(await api.accounts.list())
    setCards(await api.creditCards.list())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amount <= 0) return
    await api.expenses.create({
      amount,
      category_id: categoryId || null,
      payment_method: method,
      credit_card_id: method === 'credit_card' ? cardId || null : null,
      account_id: method !== 'credit_card' ? accountId || null : null,
      description,
      expense_date: date,
    })
    setAmount(0)
    setDescription('')
    refresh()
  }

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '—'

  return (
    <div className="space-y-5 animate-in">
      <section className={card}>
        <h2 className="font-semibold mb-4">🧾 Log an Expense</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="Amount"
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
            className={input}
          />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={input}>
            <option value="">Category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}
            className={input}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m.replace('_', ' ')}
              </option>
            ))}
          </select>
          {method === 'credit_card' ? (
            <select value={cardId} onChange={(e) => setCardId(e.target.value)} className={input}>
              <option value="">Which card?</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.bank_name}
                </option>
              ))}
            </select>
          ) : (
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={input}>
              <option value="">Account (optional)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          <input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${input} col-span-2 sm:col-span-2`}
          />
          <button className={button}>Log Expense</button>
        </form>
      </section>

      <section className={card}>
        <h2 className="font-semibold mb-2">Recent Expenses</h2>
        <ul className="divide-y divide-white/5">
          {expenses.map((e) => (
            <li key={e.id} className={listItem}>
              <div>
                <p className="font-medium text-slate-100">
                  {e.expense_date} — {categoryName(e.category_id)}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {e.payment_method.replace('_', ' ')} {e.description ? `· ${e.description}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-red-400">{peso(e.amount)}</span>
                <button
                  onClick={async () => {
                    await api.expenses.remove(e.id)
                    refresh()
                  }}
                  className={iconButton}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
          {expenses.length === 0 && <p className="text-sm text-slate-500 py-2">No expenses logged yet.</p>}
        </ul>
      </section>
    </div>
  )
}
