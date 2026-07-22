import { useEffect, useState } from 'react'
import { api, type Account, type CardOutstanding, type CreditCard, type CreditCardPayment } from '../lib/api'
import { nextDueDate, currentCycle } from '../lib/cycle'
import { peso } from '../lib/format'
import { differenceInCalendarDays, format } from 'date-fns'
import { card as cardBox, input, button, listItem } from '../lib/ui'

const CARD_GRADIENTS = [
  'from-brand-600 via-brand-700 to-emerald-900',
  'from-indigo-600 via-indigo-700 to-slate-900',
  'from-rose-600 via-rose-700 to-slate-900',
  'from-amber-600 via-amber-700 to-slate-900',
]

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
    <div className="space-y-5 animate-in">
      <section className={cardBox}>
        <h2 className="font-semibold mb-2">Record a Credit Card Payment</h2>
        <p className="text-xs text-slate-400 mb-4">
          Payments reduce your outstanding balance but are not counted as a new expense — the expense was already
          recorded when the purchase was made.
        </p>
        <form onSubmit={handlePay} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <select value={payCardId} onChange={(e) => setPayCardId(e.target.value)} className={input}>
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
            className={input}
          />
          <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={input} />
          <select value={paySourceId} onChange={(e) => setPaySourceId(e.target.value)} className={input}>
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
            className={`${input} col-span-2 sm:col-span-1`}
          />
          <button className={button}>Log Payment</button>
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
        const cardPayments = payments.filter((p) => p.credit_card_id === card.id)
        const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length]

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

              {cardPayments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-2">Recent Payments</p>
                  <ul className="divide-y divide-white/5">
                    {cardPayments.slice(0, 5).map((p) => (
                      <li key={p.id} className={listItem}>
                        <span className="text-slate-400">
                          {p.payment_date} {p.notes ? `· ${p.notes}` : ''}
                        </span>
                        <span className="font-medium text-brand-400">{peso(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
