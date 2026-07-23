import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, X } from 'lucide-react'
import { api, type Account, type Category, type CreditCard, type Expense } from '../lib/api'
import { useMoneyFormatter } from '../lib/PrivacyContext'
import { card, input, button, secondaryButton, iconButton, editButton, listItem, label as labelClass } from '../lib/ui'
import { useMonth, isInMonth } from '../lib/MonthContext'
import MonthSwitcher from '../components/MonthSwitcher'
import { parseExpenseText, type ParsedExpenseRow } from '../lib/parseExpenses'

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

  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importDate, setImportDate] = useState(new Date().toISOString().slice(0, 10))
  const [parsedRows, setParsedRows] = useState<ParsedExpenseRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

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

  function handleParse() {
    if (!importText.trim()) return setImportError('Paste some expense lines first.')
    setImportError('')
    setParsedRows(parseExpenseText(importText, categories, cards, accounts))
  }

  function updateParsedRow(index: number, patch: Partial<ParsedExpenseRow>) {
    setParsedRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function removeParsedRow(index: number) {
    setParsedRows((rows) => rows.filter((_, i) => i !== index))
  }

  async function handleImportAll() {
    if (!importDate) return setImportError('Please pick a date for these expenses.')
    const bad = parsedRows.find(
      (r) =>
        !r.amount ||
        r.amount <= 0 ||
        !r.description ||
        (r.method === 'credit_card' && !r.cardId) ||
        (r.method !== 'credit_card' && r.method !== 'cash' && !r.accountId),
    )
    if (bad) return setImportError('Some rows are missing an amount, description, card, or account. Fix them before importing.')
    setImporting(true)
    setImportError('')
    try {
      for (const row of parsedRows) {
        await api.expenses.create({
          amount: row.amount as number,
          category_id: row.categoryId || null,
          payment_method: row.method,
          credit_card_id: row.method === 'credit_card' ? row.cardId || null : null,
          account_id: row.method !== 'credit_card' ? row.accountId || null : null,
          description: row.description,
          expense_date: importDate,
        })
      }
      setShowImport(false)
      setImportText('')
      setParsedRows([])
      refresh()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Something went wrong while importing.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-5 animate-in">
      <MonthSwitcher />

      <section className={card}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">Paste From Notes</h2>
          <button type="button" className={secondaryButton} onClick={() => setShowImport((v) => !v)}>
            {showImport ? 'Close' : 'Paste Expenses'}
          </button>
        </div>
        {showImport && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-slate-400">
              Paste lines like <code>Palengke - 284 (Gcash)</code>, one expense per line. We'll guess the category and
              payment method — review before importing.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className={labelClass}>Date for these expenses</label>
                <input
                  type="date"
                  value={importDate}
                  onChange={(e) => setImportDate(e.target.value)}
                  className={`${input} w-full`}
                />
              </div>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={'Palengke - 284 (Gcash)\nOks manok - 695 (Maya CC)\nSukiya - 493 (BPI CC)'}
              rows={6}
              className={`${input} w-full font-mono text-sm`}
            />
            <div className="flex gap-2">
              <button type="button" className={button} onClick={handleParse}>
                Parse Lines
              </button>
            </div>
            {importError && <p className="text-sm text-red-400">{importError}</p>}

            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 text-xs">
                        <th className="pb-2 pr-2">Description</th>
                        <th className="pb-2 pr-2">Amount</th>
                        <th className="pb-2 pr-2">Category</th>
                        <th className="pb-2 pr-2">Method</th>
                        <th className="pb-2 pr-2">Card / Account</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, i) => (
                        <tr key={i} className="border-t border-white/5 align-top">
                          <td className="py-1.5 pr-2">
                            <input
                              value={row.description}
                              onChange={(e) => updateParsedRow(i, { description: e.target.value })}
                              className={`${input} w-full`}
                            />
                            {row.error && <p className="text-xs text-red-400 mt-1">{row.error}</p>}
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              type="number"
                              step={0.01}
                              value={row.amount ?? ''}
                              onChange={(e) => updateParsedRow(i, { amount: Number(e.target.value) })}
                              className={`${input} w-24`}
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <select
                              value={row.categoryId}
                              onChange={(e) => updateParsedRow(i, { categoryId: e.target.value })}
                              className={`${input} w-full`}
                            >
                              <option value="">Select…</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 pr-2">
                            <select
                              value={row.method}
                              onChange={(e) =>
                                updateParsedRow(i, {
                                  method: e.target.value as ParsedExpenseRow['method'],
                                  cardId: '',
                                  accountId: '',
                                })
                              }
                              className={`${input} w-full`}
                            >
                              {PAYMENT_METHODS.map((m) => (
                                <option key={m} value={m}>
                                  {m.replace('_', ' ')}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 pr-2">
                            {row.method === 'credit_card' && (
                              <select
                                value={row.cardId}
                                onChange={(e) => updateParsedRow(i, { cardId: e.target.value })}
                                className={`${input} w-full`}
                              >
                                <option value="">Select card…</option>
                                {cards.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.bank_name}
                                  </option>
                                ))}
                              </select>
                            )}
                            {row.method !== 'credit_card' && row.method !== 'cash' && (
                              <select
                                value={row.accountId}
                                onChange={(e) => updateParsedRow(i, { accountId: e.target.value })}
                                className={`${input} w-full`}
                              >
                                <option value="">Select account…</option>
                                {accounts.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="py-1.5">
                            <button type="button" onClick={() => removeParsedRow(i)} className={iconButton}>
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className={button} disabled={importing} onClick={handleImportAll}>
                  {importing ? 'Importing…' : `Import ${parsedRows.length} Expense${parsedRows.length === 1 ? '' : 's'}`}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

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
