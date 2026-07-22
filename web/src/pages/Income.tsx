import { useEffect, useState } from 'react'
import { api, type Account, type Category, type Income as IncomeRow } from '../lib/api'
import { peso } from '../lib/format'

export default function Income() {
  const [income, setIncome] = useState<IncomeRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  const [amount, setAmount] = useState<number>(0)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [description, setDescription] = useState('')

  async function refresh() {
    setIncome(await api.income.list())
    setCategories((await api.categories.list()).filter((c) => c.kind === 'income'))
    setAccounts(await api.accounts.list())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amount <= 0) return
    await api.income.create({
      amount,
      category_id: categoryId || null,
      account_id: accountId || null,
      description,
      income_date: date,
    })
    setAmount(0)
    setDescription('')
    refresh()
  }

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '—'
  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? '—'

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Log Incoming Money</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="Amount"
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Source…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Deposit to…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm col-span-2"
          />
          <button className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-md hover:bg-indigo-700">
            Log Income
          </button>
        </form>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Recent Income</h2>
        <ul className="divide-y divide-slate-100">
          {income.map((i) => (
            <li key={i.id} className="py-3 flex items-center justify-between text-sm gap-2">
              <div>
                <p className="font-medium text-slate-900">
                  {i.income_date} — {categoryName(i.category_id)}
                </p>
                <p className="text-slate-500">
                  {accountName(i.account_id)} {i.description ? `· ${i.description}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-emerald-600">{peso(i.amount)}</span>
                <button
                  onClick={async () => {
                    await api.income.remove(i.id)
                    refresh()
                  }}
                  className="text-slate-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
          {income.length === 0 && <p className="text-sm text-slate-400 py-2">No income logged yet.</p>}
        </ul>
      </section>
    </div>
  )
}
