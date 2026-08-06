import { useEffect, useMemo, useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { api, type Account, type Category, type CreditCard, type Expense, type Income, type IncomeAllocation } from '../lib/api'
import { useMoneyFormatter } from '../lib/PrivacyContext'
import { card, input, button, secondaryButton, iconButton, editButton, listItem, label as labelClass } from '../lib/ui'
import { useMonth, isInMonth } from '../lib/MonthContext'
import MonthSwitcher from '../components/MonthSwitcher'
import { getBudgetCategories } from '../lib/budget'
import { bucketColor } from '../lib/bucketColors'

const emptyForm = {
  bucket: '',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  accountId: '',
  notes: '',
}

export default function Allocations() {
  const fmt = useMoneyFormatter()
  const { selectedMonth } = useMonth()
  const [allocations, setAllocations] = useState<IncomeAllocation[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<CreditCard[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [income, setIncome] = useState<Income[]>([])
  const budgetCategories = useMemo(() => getBudgetCategories(), [])
  const buckets = useMemo(() => budgetCategories.map((b) => b.name), [budgetCategories])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  async function refresh() {
    setAllocations(await api.incomeAllocations.list())
    setAccounts(await api.accounts.list())
    setCategories(await api.categories.list())
    setCards(await api.creditCards.list())
    setExpenses(await api.expenses.list())
    setIncome(await api.income.list())
  }

  useEffect(() => {
    refresh()
  }, [])

  const monthAllocations = useMemo(
    () => allocations.filter((a) => isInMonth(a.allocation_date, selectedMonth)),
    [allocations, selectedMonth],
  )
  const monthIncome = useMemo(
    () => income.filter((i) => isInMonth(i.income_date, selectedMonth)).reduce((sum, i) => sum + i.amount, 0),
    [income, selectedMonth],
  )
  const monthExpenses = useMemo(() => expenses.filter((e) => isInMonth(e.expense_date, selectedMonth)), [expenses, selectedMonth])

  const destinationLabel = (e: Expense) => {
    if (e.payment_method === 'credit_card') return cards.find((c) => c.id === e.credit_card_id)?.bank_name ?? 'Credit Card'
    if (e.account_id) return accounts.find((a) => a.id === e.account_id)?.name ?? 'Account'
    return 'Cash'
  }

  const bucketBreakdown = useMemo(() => {
    return budgetCategories.map((b) => {
      const manual = monthAllocations.filter((a) => a.bucket === b.name)
      const tagged = monthExpenses.filter(
        (e) => e.category_id && categories.find((c) => c.id === e.category_id)?.budget_bucket === b.name,
      )
      const actual = manual.reduce((sum, a) => sum + a.amount, 0) + tagged.reduce((sum, e) => sum + e.amount, 0)
      const planned = (monthIncome * b.percent) / 100

      const byDest: Record<string, number> = {}
      for (const a of manual) {
        const label = a.account_id ? (accounts.find((acc) => acc.id === a.account_id)?.name ?? 'Account') : 'Unspecified'
        byDest[label] = (byDest[label] ?? 0) + a.amount
      }
      for (const e of tagged) {
        const label = destinationLabel(e)
        byDest[label] = (byDest[label] ?? 0) + e.amount
      }
      const destinations = Object.entries(byDest).sort((x, y) => y[1] - x[1])

      return { name: b.name, percent: b.percent, actual, planned, destinations }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetCategories, monthAllocations, monthExpenses, categories, accounts, cards, monthIncome])

  const totalAllocated = bucketBreakdown.reduce((sum, b) => sum + b.actual, 0)
  const unallocated = Math.max(0, monthIncome - totalAllocated)

  function startEdit(a: IncomeAllocation) {
    setEditingId(a.id)
    setForm({
      bucket: a.bucket,
      amount: a.amount,
      date: a.allocation_date,
      accountId: a.account_id ?? '',
      notes: a.notes ?? '',
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
    if (!form.bucket) return setFormError('Please pick where this money went.')
    if (form.amount <= 0) return setFormError('Please enter an amount greater than 0.')
    setFormError('')
    const payload = {
      bucket: form.bucket,
      amount: form.amount,
      account_id: form.accountId || null,
      allocation_date: form.date,
      notes: form.notes,
    }
    if (editingId) {
      await api.incomeAllocations.update(editingId, payload)
    } else {
      await api.incomeAllocations.create(payload)
    }
    cancelEdit()
    refresh()
  }

  return (
    <div className="space-y-5 animate-in">
      <MonthSwitcher />

      <section className={card}>
        <h2 className="font-semibold mb-1">{editingId ? 'Edit Allocation' : 'Allocate Income'}</h2>
        <p className="text-xs text-slate-400 mb-4">
          Log where a chunk of your income actually went — e.g. transferred to savings, moved into your emergency
          fund, or set aside as spending money. Expenses tagged with a bucket in Settings count automatically too.
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <label className={labelClass}>Where did it go?</label>
            <select
              value={form.bucket}
              onChange={(e) => setForm((f) => ({ ...f, bucket: e.target.value }))}
              className={`${input} w-full`}
            >
              <option value="">Select…</option>
              {buckets.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Account (optional)</label>
            <select
              value={form.accountId}
              onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
              className={`${input} w-full`}
            >
              <option value="">None</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Notes (optional)</label>
            <input
              placeholder="e.g. Transferred to Maya"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className={`${input} w-full`}
            />
          </div>
          {formError && <p className="col-span-2 sm:col-span-3 text-sm text-red-400">{formError}</p>}
          <div className="col-span-2 sm:col-span-3 flex gap-2">
            <button className={button}>{editingId ? 'Save Changes' : 'Log Allocation'}</button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className={secondaryButton}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {monthIncome > 0 && (
        <section className={card}>
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-xs text-slate-400">Income this month</span>
            <span className="text-xl font-bold tracking-tight">{fmt(monthIncome)}</span>
          </div>
          <div className="h-8 rounded-xl overflow-hidden flex bg-surface-3 border border-white/10">
            {bucketBreakdown.map((b, i) => {
              const pct = monthIncome > 0 ? (b.actual / monthIncome) * 100 : 0
              if (pct <= 0) return null
              const c = bucketColor(i)
              return (
                <div
                  key={b.name}
                  className="h-full flex items-center justify-center text-[10px] font-bold text-slate-900 overflow-hidden whitespace-nowrap"
                  style={{ width: `${pct}%`, background: c.fg }}
                  title={`${b.name}: ${fmt(b.actual)}`}
                >
                  {pct > 8 ? b.name : ''}
                </div>
              )
            })}
            {unallocated > 0 && (
              <div
                className="h-full flex items-center justify-center text-[10px] font-semibold text-slate-500"
                style={{ width: `${(unallocated / monthIncome) * 100}%` }}
              >
                {(unallocated / monthIncome) * 100 > 8 ? 'Unallocated' : ''}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {bucketBreakdown.map((b, i) => (
              <span key={b.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: bucketColor(i).fg }} />
                {b.name} — {fmt(b.actual)}
              </span>
            ))}
            {unallocated > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-sm shrink-0 bg-slate-600" />
                Not yet allocated — {fmt(unallocated)}
              </span>
            )}
          </div>
        </section>
      )}

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 px-1">Where it's landing</h2>
        <div className="space-y-2.5">
          {bucketBreakdown.map((b, i) => {
            const c = bucketColor(i)
            const progress = b.planned > 0 ? Math.min(100, (b.actual / b.planned) * 100) : b.actual > 0 ? 100 : 0
            return (
              <div key={b.name} className="rounded-2xl border border-white/5 p-4" style={{ background: c.soft }}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-bold text-sm" style={{ color: c.fg }}>
                      {b.name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Target {b.percent}% of income</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-base tabular-nums" style={{ color: c.fg }}>
                      {fmt(b.actual)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">of {fmt(b.planned)} planned</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-3">
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, background: c.fg }} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {b.destinations.length === 0 ? (
                    <span className="text-[11px] text-slate-500">Nothing logged yet</span>
                  ) : (
                    b.destinations.map(([label, amt]) => (
                      <span
                        key={label}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-black/20 text-slate-200"
                      >
                        {label} · {fmt(amt)}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <section className={card}>
        <h2 className="font-semibold mb-2">Manual Allocations Logged</h2>
        <ul className="divide-y divide-white/5">
          {monthAllocations.map((a) => (
            <li key={a.id} className={listItem}>
              <div>
                <p className="font-medium text-slate-100">
                  {a.allocation_date} — {a.bucket}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {accounts.find((acc) => acc.id === a.account_id)?.name ?? ''}
                  {a.notes ? ` · ${a.notes}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-brand-400">{fmt(a.amount)}</span>
                <button onClick={() => startEdit(a)} className={editButton}>
                  <Pencil size={14} />
                </button>
                <button
                  onClick={async () => {
                    await api.incomeAllocations.remove(a.id)
                    refresh()
                  }}
                  className={iconButton}
                >
                  <X size={14} />
                </button>
              </div>
            </li>
          ))}
          {monthAllocations.length === 0 && <p className="text-sm text-slate-500 py-2">No manual allocations logged this month.</p>}
        </ul>
      </section>
    </div>
  )
}
