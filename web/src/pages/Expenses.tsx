import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, X } from 'lucide-react'
import { api, type Account, type Category, type CreditCard, type Expense } from '../lib/api'
import { useMoneyFormatter } from '../lib/PrivacyContext'
import { card, input, button, secondaryButton, iconButton, editButton, listItem, label as labelClass } from '../lib/ui'
import { useMonth, isInMonth } from '../lib/MonthContext'
import MonthSwitcher from '../components/MonthSwitcher'

const PAYMENT_METHODS = ['cash', 'debit', 'credit_card', 'ewallet', 'bank_transfer', 'other'] as const

const emptyForm = {
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  categoryId: '',
  method: 'cash' as (typeof PAYMENT_METHODS)[number],
  cardId: '',
  accountId: '',
  description: '',
}

export default function Expenses() {
  const fmt = useMoneyFormatter()
  const { selectedMonth } = useMonth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cards, setCards] = useState<CreditCard[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  async function refresh() {
    const all = await api.expenses.list()
    setExpenses(all)
    setCategories((await api.categories.list()).filter((c) => c.kind === 'expense'))
    setAccounts(await api.accounts.list())
    setCards(await api.creditCards.list())

    const editId = searchParams.get('edit')
    if (editId) {
      const target = all.find((e) => e.id === editId)
      if (target) startEdit(target)
      setSearchParams({}, { replace: true })
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const monthExpenses = useMemo(
    () => expenses.filter((e) => isInMonth(e.expense_date, selectedMonth)),
    [expenses, selectedMonth],
  )

  function startEdit(e: Expense) {
    setEditingId(e.id)
    setForm({
      amount: e.amount,
      date: e.expense_date,
      categoryId: e.category_id ?? '',
      method: e.payment_method as (typeof PAYMENT_METHODS)[number],
      cardId: e.credit_card_id ?? '',
      accountId: e.account_id ?? '',
      description: e.description ?? '',
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
    if (!form.categoryId) return setFormError('Please select a category.')
    if (form.method === 'credit_card' && !form.cardId) return setFormError('Please select which card this was charged to.')
    if (form.method !== 'credit_card' && form.method !== 'cash' && !form.accountId)
      return setFormError('Please select which account this was paid from.')
    setFormError('')
    const payload = {
      amount: form.amount,
      category_id: form.categoryId || null,
      payment_method: form.method,
      credit_card_id: form.method === 'credit_card' ? form.cardId || null : null,
      account_id: form.method !== 'credit_card' ? form.accountId || null : null,
      description: form.description,
      expense_date: form.date,
    }
    if (editingId) {
      await api.expenses.update(editingId, payload)
    } else {
      await api.expenses.create(payload)
    }
    cancelEdit()
    refresh()
  }

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '—'

  return (
    <div className="space-y-5 animate-in">
      <MonthSwitcher />

      <section className={card}>
        <h2 className="font-semibold mb-1">{editingId ? 'Edit Expense' : 'Log an Expense'}</h2>
        <p className="text-xs text-slate-400 mb-4">
          Swiped your credit card? Log it here with payment method "Credit Card" — it counts as an expense right
          away. Only use the Credit Cards page when you're paying off the bill.
        </p>
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
            <label className={labelClass}>Category</label>
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
            <label className={labelClass}>Payment Method</label>
            <select
              value={form.method}
              onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as (typeof PAYMENT_METHODS)[number] }))}
              className={`${input} w-full`}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          {form.method === 'credit_card' && (
            <div>
              <label className={labelClass}>Which Card?</label>
              <select
                value={form.cardId}
                onChange={(e) => setForm((f) => ({ ...f, cardId: e.target.value }))}
                className={`${input} w-full`}
              >
                <option value="">Select card…</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.bank_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {form.method !== 'credit_card' && form.method !== 'cash' && (
            <div>
              <label className={labelClass}>Paid From</label>
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
          )}
          <div className="col-span-2">
            <label className={labelClass}>Description</label>
            <input
              placeholder="What was this for?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={`${input} w-full`}
            />
          </div>
          {formError && <p className="col-span-2 sm:col-span-3 text-sm text-red-400">{formError}</p>}
          <div className="col-span-2 sm:col-span-3 flex gap-2">
            <button className={button}>{editingId ? 'Save Changes' : 'Log Expense'}</button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className={secondaryButton}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className={card}>
        <h2 className="font-semibold mb-2">Expenses This Month</h2>
        <ul className="divide-y divide-white/5">
          {monthExpenses.map((e) => (
            <li key={e.id} className={listItem}>
              <div>
                <p className="font-medium text-slate-100">
                  {e.expense_date} — {categoryName(e.category_id)}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {e.payment_method.replace('_', ' ')} {e.description ? `· ${e.description}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-red-400">{fmt(e.amount)}</span>
                <button onClick={() => startEdit(e)} className={editButton}>
                  <Pencil size={14} />
                </button>
                <button
                  onClick={async () => {
                    await api.expenses.remove(e.id)
                    refresh()
                  }}
                  className={iconButton}
                >
                  <X size={14} />
                </button>
              </div>
            </li>
          ))}
          {monthExpenses.length === 0 && <p className="text-sm text-slate-500 py-2">No expenses logged this month.</p>}
        </ul>
      </section>
    </div>
  )
}
