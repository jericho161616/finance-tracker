import { useEffect, useState } from 'react'
import { api, type Account, type CardOutstanding, type CreditCard, type CreditCardPayment, type Expense } from '../lib/api'
import { nextDueDate, currentCycle } from '../lib/cycle'
import { peso } from '../lib/format'
import { differenceInCalendarDays, format } from 'date-fns'
import { card as cardBox, input, button, label as labelClass } from '../lib/ui'

const CARD_GRADIENTS = [
  'from-brand-600 via-brand-700 to-emerald-900',
  'from-indigo-600 via-indigo-700 to-slate-900',
  'from-rose-600 via-rose-700 to-slate-900',
  'from-amber-600 via-amber-700 to-slate-900',
]

type StatementRow =
  | { kind: 'expense'; date: string; description: string; amount: number }
  | { kind: 'payment'; date: string; description: string; amount: number }

export default function CreditCards() {
  const [cards, setCards] = useState<CreditCard[]>([])
  const [outstanding, setOutstanding] = useState<CardOutstanding[]>([])
  const [payments, setPayments] = useState<CreditCardPayment[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  const [payCardId, setPayCardId] = useState('')
  const [payAmount, setPayAmount] = useState(0)
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [paySourceId, setPaySourceId] = useState('')
  const [payNotes, setPayNotes] = useState('')

  async function refresh() {
    setCards(await api.creditCards.list())
    setOutstanding(await api.outstanding.list())
    setPayments(await api.creditCardPayments.list())
    setAccounts(await api.accounts.list())
    setExpenses(await api.expenses.list())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!payCardId || payAmount <= 0) return
    await api.creditCardPayments.create({
      credit_card_id: payCardId,
      amount: payAmount,
      payment_source_account_id: paySourceId || null,
      payment_date: payDate,
      notes: payNotes,
    })
    setPayAmount(0)
    setPayNotes('')
    refresh()
  }

  return (
    <div className="space-y-5 animate-in">
      <section className={cardBox}>
        <h2 className="font-semibold mb-1">Record a Credit Card Payment</h2>
        <p className="text-xs text-amber-400/90 mb-4">
          ⚠️ This is only for paying your bill (e.g. transferring money from savings to the card). To log a purchase
          you swiped, use the Expenses page instead — payments here don't count as new expenses since the purchase
          was already recorded there.
        </p>
        <form onSubmit={handlePay} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Which Card?</label>
            <select value={payCardId} onChange={(e) => setPayCardId(e.target.value)} className={`${input} w-full`}>
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
              value={payAmount || ''}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              className={`${input} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Payment Date</label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className={`${input} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Paid From</label>
            <select value={paySourceId} onChange={(e) => setPaySourceId(e.target.value)} className={`${input} w-full`}>
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
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className={`${input} w-full`}
            />
          </div>
          <button className={`${button} col-span-2 sm:col-span-3`}>Log Payment</button>
        </form>
      </section>

      {cards.length === 0 && <p className="text-sm text-slate-500">No credit cards yet — add one in Settings.</p>}

      {cards.map((card, idx) => {
        const o = outstanding.find((x) => x.credit_card_id === card.id)
        const bal = o?.outstanding_balance ?? 0
        const avail = o?.available_credit ?? card.credit_limit
        const utilization = card.credit_limit > 0 ? Math.min(100, Math.max(0, (bal / card.credit_limit) * 100)) : 0
        const due = nextDueDate(card.statement_day, card.due_day)
        const daysUntilDue = differenceInCalendarDays(due, new Date())
        const { cycleStart, cycleEnd } = currentCycle(card.statement_day)
        const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length]

        const cycleStartStr = format(cycleStart, 'yyyy-MM-dd')
        const cycleEndStr = format(cycleEnd, 'yyyy-MM-dd')

        const statementRows: StatementRow[] = [
          ...expenses
            .filter((e) => e.credit_card_id === card.id && e.expense_date >= cycleStartStr && e.expense_date <= cycleEndStr)
            .map((e): StatementRow => ({ kind: 'expense', date: e.expense_date, description: e.description || '—', amount: e.amount })),
          ...payments
            .filter((p) => p.credit_card_id === card.id && p.payment_date >= cycleStartStr && p.payment_date <= cycleEndStr)
            .map((p): StatementRow => ({ kind: 'payment', date: p.payment_date, description: p.notes || 'Payment', amount: p.amount })),
        ].sort((a, b) => a.date.localeCompare(b.date))

        let runningTotal = 0
        const rowsWithTotals = statementRows.map((row) => {
          runningTotal += row.kind === 'expense' ? row.amount : -row.amount
          return { ...row, runningTotal, availableAfter: card.credit_limit - runningTotal }
        })

        return (
          <section key={card.id} className="rounded-3xl overflow-hidden border border-white/5">
            <div className={`bg-gradient-to-br ${gradient} p-6 text-white`}>
              <div className="flex items-center justify-between mb-6">
                <p className="font-semibold text-lg">{card.bank_name}</p>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    daysUntilDue <= 5 ? 'bg-red-500/90' : 'bg-white/15'
                  }`}
                >
                  Due {format(due, 'MMM d')} · {daysUntilDue}d
                </span>
              </div>
              <p className="text-white/70 text-xs">Outstanding Balance</p>
              <p className="text-3xl font-bold tracking-tight">{peso(bal)}</p>
              <div className="flex justify-between mt-6 text-xs text-white/70">
                <span>Available {peso(avail)}</span>
                <span>Limit {peso(card.credit_limit)}</span>
              </div>
            </div>

            <div className="bg-surface-2 p-5">
              <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${utilization > 80 ? 'bg-red-500' : utilization > 50 ? 'bg-amber-400' : 'bg-brand-500'}`}
                  style={{ width: `${utilization}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mb-4">
                {utilization.toFixed(0)}% utilized · Cycle {format(cycleStart, 'MMM d')} – {format(cycleEnd, 'MMM d')}
              </p>

              {rowsWithTotals.length > 0 ? (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-xs min-w-[420px]">
                    <thead>
                      <tr className="text-slate-500 text-left">
                        <th className="font-medium px-2 py-1.5">Date</th>
                        <th className="font-medium px-2 py-1.5">Description</th>
                        <th className="font-medium px-2 py-1.5 text-right">Amount</th>
                        <th className="font-medium px-2 py-1.5 text-right">Running Total</th>
                        <th className="font-medium px-2 py-1.5 text-right">Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsWithTotals.map((row, i) => {
                        const isFullyPaid = row.kind === 'payment' && row.runningTotal <= 0
                        return (
                          <tr
                            key={i}
                            className={`border-t border-white/5 ${isFullyPaid ? 'bg-brand-500/15' : ''}`}
                          >
                            <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap">{row.date}</td>
                            <td className="px-2 py-1.5 text-slate-300">{row.description}</td>
                            <td
                              className={`px-2 py-1.5 text-right font-medium ${
                                row.kind === 'payment' ? 'text-brand-400' : 'text-red-400'
                              }`}
                            >
                              {row.kind === 'payment' ? '−' : ''}
                              {peso(row.amount)}
                            </td>
                            <td className="px-2 py-1.5 text-right text-slate-200">{peso(row.runningTotal)}</td>
                            <td className="px-2 py-1.5 text-right text-slate-400">
                              {isFullyPaid ? (
                                <span className="text-brand-400 font-semibold">PAID</span>
                              ) : (
                                peso(row.availableAfter)
                              )}
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
    </div>
  )
}
