import { format } from 'date-fns'
import { getCycle, getDueDate } from './cycle'
import type { CreditCard, CreditCardPayment, Expense } from './api'

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
