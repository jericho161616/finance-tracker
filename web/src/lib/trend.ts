import { format, startOfMonth, subMonths } from 'date-fns'
import type { Expense } from './api'

export interface MonthlyTotal {
  label: string
  monthKey: string
  total: number
}

/** Total expenses per month for the trailing `months` months, ending at `referenceDate` (inclusive). */
export function computeMonthlyExpenseTotals(
  expenses: Expense[],
  months: number,
  referenceDate: Date = new Date(),
): MonthlyTotal[] {
  const start = startOfMonth(referenceDate)
  const buckets: MonthlyTotal[] = []
  for (let i = months - 1; i >= 0; i--) {
    const month = subMonths(start, i)
    const monthKey = format(month, 'yyyy-MM')
    const total = expenses
      .filter((e) => e.expense_date.slice(0, 7) === monthKey)
      .reduce((sum, e) => sum + e.amount, 0)
    buckets.push({ label: format(month, months > 6 ? 'MMM ‘yy' : 'MMM'), monthKey, total })
  }
  return buckets
}
