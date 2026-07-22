import { useEffect, useState } from 'react'
import { api, type Account, type CardOutstanding, type CreditCard, type CreditCardPayment } from '../lib/api'
import { nextDueDate, currentCycle } from '../lib/cycle'
import { peso } from '../lib/format'
import { differenceInCalendarDays, format } from 'date-fns'

export default function CreditCards() {
  const [cards, setCards] = useState<CreditCard[]>([])
  const [outstanding, setOutstanding] = useState<CardOutstanding[]>([])
  const [payments, setPayments] = useState<CreditCardPayment[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

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
    <div className="space-y-6">
      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Record a Credit Card Payment</h2>
        <p className="text-xs text-slate-400 mb-3">
          Payments reduce your outstanding balance but are not counted as a new expense — the expense was already
          recorded when the purchase was made.
        </p>
        <form onSubmit={handlePay} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <select
            value={payCardId}
            onChange={(e) => setPayCardId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Which card?</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.bank_name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="Payment amount"
            value={payAmount || ''}
            onChange={(e) => setPayAmount(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={paySourceId}
            onChange={(e) => setPaySourceId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Payment source</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Notes (optional)"
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm col-span-2 sm:col-span-1"
          />
          <button className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-md hover:bg-indigo-700">
            Log Payment
          </button>
        </form>
      </section>

      {cards.length === 0 && (
        <p className="text-sm text-slate-400">No credit cards yet — add one in Settings.</p>
      )}

      {cards.map((card) => {
        const o = outstanding.find((x) => x.credit_card_id === card.id)
        const bal = o?.outstanding_balance ?? 0
        const avail = o?.available_credit ?? card.credit_limit
        const utilization = card.credit_limit > 0 ? Math.min(100, Math.max(0, (bal / card.credit_limit) * 100)) : 0
        const due = nextDueDate(card.statement_day, card.due_day)
        const daysUntilDue = differenceInCalendarDays(due, new Date())
        const { cycleStart, cycleEnd } = currentCycle(card.statement_day)
        const cardPayments = payments.filter((p) => p.credit_card_id === card.id)

        return (
          <section key={card.id} className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">💳 {card.bank_name}</h3>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  daysUntilDue <= 5 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-50 text-slate-500 border border-slate-200'
                }`}
              >
                Due {format(due, 'MMM d, yyyy')} ({daysUntilDue} days)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3 text-sm">
              <div>
                <p className="text-slate-400">Outstanding</p>
                <p className="font-semibold text-slate-900">{peso(bal)}</p>
              </div>
              <div>
                <p className="text-slate-400">Credit Limit</p>
                <p className="font-semibold text-slate-900">{peso(card.credit_limit)}</p>
              </div>
              <div>
                <p className="text-slate-400">Available Credit</p>
                <p className="font-semibold text-slate-900">{peso(avail)}</p>
              </div>
              <div>
                <p className="text-slate-400">Current Cycle</p>
                <p className="font-semibold text-slate-900">
                  {format(cycleStart, 'MMM d')} – {format(cycleEnd, 'MMM d')}
                </p>
              </div>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full ${utilization > 80 ? 'bg-red-500' : utilization > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${utilization}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mb-4">{utilization.toFixed(0)}% utilized</p>

            {cardPayments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Recent Payments</p>
                <ul className="divide-y divide-slate-100">
                  {cardPayments.slice(0, 5).map((p) => (
                    <li key={p.id} className="py-2 flex justify-between text-sm">
                      <span className="text-slate-500">{p.payment_date} {p.notes ? `· ${p.notes}` : ''}</span>
                      <span className="font-medium text-emerald-600">{peso(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
