import { format } from 'date-fns'
import { getCycle, getDueDate } from './cycle'
import type { CreditCard, CreditCardPayment, Expense } from './api'

/**
 * Bank-style balances for a card, mirroring how card issuers present debt:
 * - currentBalance: everything owed right now, a running total across all history
 *   (all charges minus all payments, ever) — never resets, always accurate.
 * - statementBalance: the amount that was locked in when the most recently closed
 *   cycle ended — this is what's actually due by `dueDate`. Charges made after that
 *   cycle closed count toward currentBalance but aren't due yet.
 */
export function computeCardBalances(
  card: CreditCard,
  expenses: Expense[],
  payments: CreditCardPayment[],
  today: Date = new Date(),
) {
  const cardExpenses = expenses.filter((e) => e.credit_card_id === card.id)
  const cardPayments = payments.filter((p) => p.credit_card_id === card.id)
  const todayStr = format(today, 'yyyy-MM-dd')

  const balanceAsOf = (cutoffStr: string) =>
    cardExpenses.filter((e) => e.expense_date <= cutoffStr).reduce((sum, e) => sum + e.amount, 0) -
    cardPayments.filter((p) => p.payment_date <= cutoffStr).reduce((sum, p) => sum + p.amount, 0)

  const currentBalance = balanceAsOf(todayStr)

  const { cycleEnd: statementDate } = getCycle(card.statement_day, -1, today)
  const statementDateStr = format(statementDate, 'yyyy-MM-dd')
  const statementBalance = balanceAsOf(statementDateStr)
  const dueDate = getDueDate(statementDate, card.due_day)

  return { currentBalance, statementBalance, statementDate, dueDate }
}

export interface StatementRow {
  kind: 'expense' | 'payment'
  id: string
  date: string
  description: string
  amount: number
  runningTotal: number
  availableAfter: number
}

/**
 * Statement for one billing cycle. Expenses are attributed by charge date within
 * the cycle; payments are attributed by the cycle whose [cycleStart, dueDate] grace
 * window contains the payment date — so a payment made after the cycle closes but
 * before its due date still pays off that cycle, not the next one.
 */
export function computeCycleStatement(
  card: CreditCard,
  expenses: Expense[],
  payments: CreditCardPayment[],
  cycleOffset: number = 0,
) {
  const { cycleStart, cycleEnd } = getCycle(card.statement_day, cycleOffset)
  const dueDate = getDueDate(cycleEnd, card.due_day)
  const cycleStartStr = format(cycleStart, 'yyyy-MM-dd')
  const cycleEndStr = format(cycleEnd, 'yyyy-MM-dd')
  const dueDateStr = format(dueDate, 'yyyy-MM-dd')

  const rows = [
    ...expenses
      .filter((e) => e.credit_card_id === card.id && e.expense_date >= cycleStartStr && e.expense_date <= cycleEndStr)
      .map((e) => ({
        kind: 'expense' as const,
        id: e.id,
        date: e.expense_date,
        description: e.description || '—',
        amount: e.amount,
      })),
    ...payments
      .filter((p) => p.credit_card_id === card.id && p.payment_date >= cycleStartStr && p.payment_date <= dueDateStr)
      .map((p) => ({
        kind: 'payment' as const,
        id: p.id,
        date: p.payment_date,
        description: p.notes || 'Payment',
        amount: p.amount,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  let runningTotal = 0
  const rowsWithTotals: StatementRow[] = rows.map((r) => {
    runningTotal += r.kind === 'expense' ? r.amount : -r.amount
    return { ...r, runningTotal, availableAfter: card.credit_limit - runningTotal }
  })

  const balance = rowsWithTotals.length ? rowsWithTotals[rowsWithTotals.length - 1].runningTotal : 0
  return { cycleStart, cycleEnd, dueDate, rows: rowsWithTotals, balance }
}
