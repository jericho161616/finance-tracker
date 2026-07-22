import { useEffect, useMemo, useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { api, type Account, type Category, type Income as IncomeRow } from '../lib/api'
import { useMoneyFormatter } from '../lib/PrivacyContext'
import { card, input, button, secondaryButton, iconButton, editButton, listItem, label as labelClass } from '../lib/ui'
import { useMonth, isInMonth } from '../lib/MonthContext'
import MonthSwitcher from '../components/MonthSwitcher'

const emptyForm = {
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  categoryId: '',
  accountId: '',
  description: '',
}

export default function Income() {
  const fmt = useMoneyFormatter()
  const { selectedMonth } = useMonth()
  const [income, setIncome] = useState<IncomeRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  async function refresh() {
    setIncome(await api.income.list())
    setCategories((await api.categories.list()).filter((c) => c.kind === 'income'))
    setAccounts(await api.accounts.list())
  }

  useEffect(() => {
    refresh()
  }, [])

  const monthIncome = useMemo(
    () => income.filter((i) => isInMonth(i.income_date, selectedMonth)),
    [income, selectedMonth],
  )

  function startEdit(i: IncomeRow) {
    setEditingId(i.id)
    setForm({
      amount: i.amount,
      date: i.income_date,
      categoryId: i.category_id ?? '',
      accountId: i.account_id ?? '',
      description: i.description ?? '',
    })
    setFormError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.date) return setFormError('Please pick a date.')
    if (form.amount <= 0) return setFormError('Please enter an amount greater than 0.')
    if (!form.categoryId) return setFormError('Please select a source.')
    if (!form.accountId) return setFormError('Please select which account this was deposited to.')
    setFormError('')
    const payload = {
      amount: form.amount,
      category_id: form.categoryId || null,
      account_id: form.accountId || null,
      description: form.description,
      income_date: form.date,
    }
    if (editingId) {
      await api.income.update(editingId, payload)
    } else {
      await api.income.create(payload)
    }
    cancelEdit()
    refresh()
  }

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '—'
  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? '—'

  return (
    <div className="space-y-5 animate-in">
      <MonthSwitcher />

      <section className={card}>
        <h2 className="font-semibold mb-4">{editingId ? 'Edit Income' : 'Log Incoming Money'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={`${input} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Amount</label>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={form.amount || ''}
              onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
              className={`${input} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Source</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className={`${input} w-full`}
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Deposit To</label>
            <select
              value={form.accountId}
              onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
              className={`${input} w-full`}
            >
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Description</label>
            <input
              placeholder="Optional note"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={`${input} w-full`}
            />
          </div>
          {formError && <p className="col-span-2 sm:col-span-3 text-sm text-red-400">{formError}</p>}
          <div className="col-span-2 sm:col-span-3 flex gap-2">
            <button className={button}>{editingId ? 'Save Changes' : 'Log Income'}</button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className={secondaryButton}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className={card}>
        <h2 className="font-semibold mb-2">Income This Month</h2>
        <ul className="divide-y divide-white/5">
          {monthIncome.map((i) => (
            <li key={i.id} className={listItem}>
              <div>
                <p className="font-medium text-slate-100">
                  {i.income_date} — {categoryName(i.category_id)}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {accountName(i.account_id)} {i.description ? `· ${i.description}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-brand-400">{fmt(i.amount)}</span>
                <button onClick={() => startEdit(i)} className={editButton}>
                  <Pencil size={14} />
                </button>
                <button
                  onClick={async () => {
                    await api.income.remove(i.id)
                    refresh()
                  }}
                  className={iconButton}
                >
                  <X size={14} />
                </button>
              </div>
            </li>
          ))}
          {monthIncome.length === 0 && <p className="text-sm text-slate-500 py-2">No income logged this month.</p>}
        </ul>
      </section>
    </div>
  )
}
