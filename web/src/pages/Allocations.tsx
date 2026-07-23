import { useEffect, useMemo, useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { api, type Account, type IncomeAllocation } from '../lib/api'
import { useMoneyFormatter } from '../lib/PrivacyContext'
import { card, input, button, secondaryButton, iconButton, editButton, listItem, label as labelClass } from '../lib/ui'
import { useMonth, isInMonth } from '../lib/MonthContext'
import MonthSwitcher from '../components/MonthSwitcher'
import { getBudgetCategories } from '../lib/budget'

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
  const buckets = useMemo(() => getBudgetCategories().map((b) => b.name), [])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  async function refresh() {
    setAllocations(await api.incomeAllocations.list())
    setAccounts(await api.accounts.list())
  }

  useEffect(() => {
    refresh()
  }, [])

  const monthAllocations = useMemo(
    () => allocations.filter((a) => isInMonth(a.allocation_date, selectedMonth)),
    [allocations, selectedMonth],
  )

  const totalAllocated = monthAllocations.reduce((sum, a) => sum + a.amount, 0)
  const byBucket = monthAllocations.reduce<Record<string, number>>((acc, a) => {
    acc[a.bucket] = (acc[a.bucket] ?? 0) + a.amount
    return acc
  }, {})

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
          fund, or set aside as spending money. This powers "Actual Allocation" on the Dashboard.
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

      <section className={card}>
        <h2 className="font-semibold mb-2">Allocated This Month</h2>
        <p className="text-xs text-slate-500 mb-3">Total: {fmt(totalAllocated)}</p>
        {Object.keys(byBucket).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(byBucket).map(([bucket, amt]) => (
              <span key={bucket} className="text-xs bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-slate-300">
                {bucket}: <span className="font-medium text-slate-100">{fmt(amt)}</span>
              </span>
            ))}
          </div>
        )}
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
          {monthAllocations.length === 0 && <p className="text-sm text-slate-500 py-2">No allocations logged this month.</p>}
        </ul>
      </section>
    </div>
  )
}
