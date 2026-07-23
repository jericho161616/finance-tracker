import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react'
import { api, type Account, type Category, type CreditCard, type CreditCardPayment, type Expense } from '../lib/api'
import { computeCycleStatement, computeCardBalances } from '../lib/cardBalance'
import { useMoneyFormatter } from '../lib/PrivacyContext'
import { differenceInCalendarDays, format } from 'date-fns'
import { card as cardBox, input, button, secondaryButton, label as labelClass } from '../lib/ui'

const CARD_GRADIENTS = [
  'from-brand-600 via-brand-700 to-emerald-900',
  'from-indigo-600 via-indigo-700 to-slate-900',
  'from-rose-600 via-rose-700 to-slate-900',
  'from-amber-600 via-amber-700 to-slate-900',
]

const emptyPayForm = {
  cardId: '',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  sourceId: '',
  notes: '',
}

const emptyExpenseForm = {
  date: new Date().toISOString().slice(0, 10),
  description: '',
  amount: 0,
  categoryId: '',
}

export default function CreditCards() {
  const fmt = useMoneyFormatter()
  const [cards, setCards] = useState<CreditCard[]>([])
  const [payments, setPayments] = useState<CreditCardPayment[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cycleOffsets, setCycleOffsets] = useState<Record<string, number>>({})

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [payForm, setPayForm] = useState(emptyPayForm)
  const [formError, setFormError] = useState('')

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm)
  const [expenseFormError, setExpenseFormError] = useState('')

  async function refresh() {
    setCards(await api.creditCards.list())
    setPayments(await api.creditCardPayments.list())
    setAccounts(await api.accounts.list())
    setExpenses(await api.expenses.list())
    setCategories((await api.categories.list()).filter((c) => c.kind === 'expense'))
  }

  useEffect(() => {
    refresh()
  }, [])

  function startEditPayment(p: CreditCardPayment) {
    setEditingPaymentId(p.id)
    setPayForm({
      cardId: p.credit_card_id,
      amount: p.amount,
      date: p.payment_date,
      sourceId: p.payment_source_account_id ?? '',
      notes: p.notes ?? '',
    })
    setFormError('')
  }

  function cancelEditPayment() {
    setEditingPaymentId(null)
    setPayForm(emptyPayForm)
    setFormError('')
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!payForm.cardId) return setFormError('Please select which card this payment is for.')
    if (payForm.amount <= 0) return setFormError('Please enter a payment amount greater than 0.')
    if (!payForm.sourceId) return setFormError('Please select which account this payment came from.')
    setFormError('')

    const payload = {
      credit_card_id: payForm.cardId,
      amount: payForm.amount,
      payment_source_account_id: payForm.sourceId || null,
      payment_date: payForm.date,
      notes: payForm.notes,
    }
    if (editingPaymentId) {
      await api.creditCardPayments.update(editingPaymentId, payload)
    } else {
      await api.creditCardPayments.create(payload)
    }
    cancelEditPayment()
    refresh()
  }

  function shiftCycle(cardId: string, delta: number) {
    setCycleOffsets((prev) => ({ ...prev, [cardId]: (prev[cardId] ?? 0) + delta }))
  }

  function startEditExpense(e: Expense) {
    setEditingExpenseId(e.id)
    setExpenseForm({
      date: e.expense_date,
      description: e.description ?? '',
      amount: e.amount,
      categoryId: e.category_id ?? '',
    })
    setExpenseFormError('')
  }

  function cancelEditExpense() {
    setEditingExpenseId(null)
    setExpenseForm(emptyExpenseForm)
    setExpenseFormError('')
  }

  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!editingExpenseId) return
    if (!expenseForm.date) return setExpenseFormError('Please pick a date.')
    if (expenseForm.amount <= 0) return setExpenseFormError('Please enter an amount greater than 0.')
    setExpenseFormError('')
    await api.expenses.update(editingExpenseId, {
      expense_date: expenseForm.date,
      description: expenseForm.description,
      amount: expenseForm.amount,
      category_id: expenseForm.categoryId || null,
    })
    cancelEditExpense()
    refresh()
  }

  return (
    <div className="space-y-5 animate-in">
      <section className={cardBox}>
        <h2 className="font-semibold mb-1">{editingPaymentId ? 'Edit Payment' : 'Record a Credit Card Payment'}</h2>
        <p className="flex items-start gap-1.5 text-xs text-amber-400/90 mb-4">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          This is only for paying your bill (e.g. transferring money from savings to the card). To log a purchase
          you swiped, use the Expenses page instead — payments here don't count as new expenses since the purchase
          was already recorded there.
        </p>
        <form onSubmit={handlePay} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Which Card?</label>
            <select
              value={payForm.cardId}
              onChange={(e) => setPayForm((f) => ({ ...f, cardId: e.target.value }))}
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
          <div>
            <label className={labelClass}>Payment Amount</label>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={payForm.amount || ''}
              onChange={(e) => setPayForm((f) => ({ ...f, amount: Number(e.target.value) }))}
              className={`${input} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Payment Date</label>
            <input
              type="date"
              value={payForm.date}
              onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))}
              className={`${input} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Paid From</label>
            <select
              value={payForm.sourceId}
              onChange={(e) => setPayForm((f) => ({ ...f, sourceId: e.target.value }))}
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
          <div className="col-span-2 sm:col-span-1">
            <label className={labelClass}>Notes (optional)</label>
            <input
              placeholder="e.g. Full payment"
              value={payForm.notes}
              onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
              className={`${input} w-full`}
            />
          </div>
          {formError && <p className="col-span-2 sm:col-span-3 text-sm text-red-400">{formError}</p>}
          <div className="col-span-2 sm:col-span-3 flex gap-2">
            <button className={button}>{editingPaymentId ? 'Save Changes' : 'Log Payment'}</button>
            {editingPaymentId && (
              <button type="button" onClick={cancelEditPayment} className={secondaryButton}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {cards.length === 0 && <p className="text-sm text-slate-500">No credit cards yet — add one in Settings.</p>}

      {cards.map((card, idx) => {
        const offset = cycleOffsets[card.id] ?? 0
        const { cycleStart, cycleEnd, rows } = computeCycleStatement(card, expenses, payments, offset)
        const { currentBalance, statementBalance, dueDate } = computeCardBalances(card, expenses, payments)
        const avail = card.credit_limit - currentBalance
        const utilization =
          card.credit_limit > 0 ? Math.min(100, Math.max(0, (currentBalance / card.credit_limit) * 100)) : 0
        const daysUntilDue = differenceInCalendarDays(dueDate, new Date())
        const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length]

        return (
          <section key={card.id} className="rounded-3xl overflow-hidden border border-white/5">
            <div className={`bg-gradient-to-br ${gradient} p-6 text-white`}>
              <div className="flex items-center justify-between mb-6">
                <p className="font-semibold text-lg">{card.bank_name}</p>
                {statementBalance > 0 && (
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      daysUntilDue <= 5 ? 'bg-red-500/90' : 'bg-white/15'
                    }`}
                  >
                    {fmt(statementBalance)} due {format(dueDate, 'MMM d')} ·{' '}
                    {daysUntilDue >= 0 ? `${daysUntilDue}d` : 'past due'}
                  </span>
                )}
              </div>
              <p className="text-white/70 text-xs">Current Balance</p>
              <p className="text-3xl font-bold tracking-tight">{fmt(currentBalance)}</p>
              <div className="flex justify-between mt-6 text-xs text-white/70">
                <span>Available {fmt(avail)}</span>
                <span>Limit {fmt(card.credit_limit)}</span>
              </div>
            </div>

            <div className="bg-surface-2 p-5">
              <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${utilization > 80 ? 'bg-red-500' : utilization > 50 ? 'bg-amber-400' : 'bg-brand-500'}`}
                  style={{ width: `${utilization}%` }}
                />
              </div>

              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => shiftCycle(card.id, -1)}
                  className="tap-shrink text-slate-400 hover:text-slate-100 p-1"
                  aria-label="Previous cycle"
                >
                  <ChevronLeft size={16} />
                </button>
                <p className="text-xs text-slate-400">
                  {utilization.toFixed(0)}% utilized · Viewing cycle {format(cycleStart, 'MMM d')} – {format(cycleEnd, 'MMM d')}
                  {offset !== 0 && (
                    <button
                      onClick={() => setCycleOffsets((prev) => ({ ...prev, [card.id]: 0 }))}
                      className="tap-shrink ml-2 text-brand-400 hover:text-brand-300"
                    >
                      (back to current)
                    </button>
                  )}
                </p>
                <button
                  onClick={() => shiftCycle(card.id, 1)}
                  className="tap-shrink text-slate-400 hover:text-slate-100 p-1"
                  aria-label="Next cycle"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {rows.length > 0 ? (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-xs min-w-[480px]">
                    <thead>
                      <tr className="text-slate-500 text-left">
                        <th className="font-medium px-2 py-1.5">Date</th>
                        <th className="font-medium px-2 py-1.5">Description</th>
                        <th className="font-medium px-2 py-1.5 text-right">Amount</th>
                        <th className="font-medium px-2 py-1.5 text-right">Running Total</th>
                        <th className="font-medium px-2 py-1.5 text-right">Available</th>
                        <th className="font-medium px-2 py-1.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const isFullyPaid = row.kind === 'payment' && row.runningTotal <= 0
                        return (
                          <tr key={`${row.kind}-${row.id}`} className={`border-t border-white/5 ${isFullyPaid ? 'bg-brand-500/15' : ''}`}>
                            <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap">{row.date}</td>
                            <td className="px-2 py-1.5 text-slate-300">{row.description}</td>
                            <td
                              className={`px-2 py-1.5 text-right font-medium ${
                                row.kind === 'payment' ? 'text-brand-400' : 'text-red-400'
                              }`}
                            >
                              {row.kind === 'payment' ? '−' : ''}
                              {fmt(row.amount)}
                            </td>
                            <td className="px-2 py-1.5 text-right text-slate-200">{fmt(row.runningTotal)}</td>
                            <td className="px-2 py-1.5 text-right text-slate-400">
                              {isFullyPaid ? <span className="text-brand-400 font-semibold">PAID</span> : fmt(row.availableAfter)}
                            </td>
                            <td className="px-2 py-1.5 text-right whitespace-nowrap">
                              {row.kind === 'expense' ? (
                                <button
                                  onClick={() => {
                                    const exp = expenses.find((ex) => ex.id === row.id)
                                    if (exp) startEditExpense(exp)
                                  }}
                                  className="tap-shrink inline-flex text-slate-500 hover:text-brand-400 mr-2"
                                >
                                  <Pencil size={13} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    const p = payments.find((pp) => pp.id === row.id)
                                    if (p) startEditPayment(p)
                                  }}
                                  className="tap-shrink inline-flex text-slate-500 hover:text-brand-400 mr-2"
                                >
                                  <Pencil size={13} />
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  if (row.kind === 'expense') await api.expenses.remove(row.id)
                                  else await api.creditCardPayments.remove(row.id)
                                  refresh()
                                }}
                                className="tap-shrink inline-flex text-slate-500 hover:text-red-400"
                              >
                                <X size={13} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No activity in this billing cycle yet.</p>
              )}
            </div>
          </section>
        )
      })}

      {editingExpenseId && (
        <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center p-4" onClick={cancelEditExpense}>
          <div className={`${cardBox} w-full max-w-md`} onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold mb-3">Edit Expense</h2>
            <form onSubmit={handleSaveExpense} className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
                  className={`${input} w-full`}
                />
              </div>
              <div>
                <label className={labelClass}>Amount</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={expenseForm.amount || ''}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                  className={`${input} w-full`}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Description</label>
                <input
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                  className={`${input} w-full`}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Category</label>
                <select
                  value={expenseForm.categoryId}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, categoryId: e.target.value }))}
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
              {expenseFormError && <p className="col-span-2 text-sm text-red-400">{expenseFormError}</p>}
              <div className="col-span-2 flex gap-2">
                <button className={button}>Save Changes</button>
                <button type="button" onClick={cancelEditExpense} className={secondaryButton}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
