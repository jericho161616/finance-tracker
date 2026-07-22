import { setDate, addMonths, subMonths, isBefore, addDays } from 'date-fns'

/** Clamp a target day-of-month to a valid date within that month (e.g. day 31 in Feb). */
function safeSetDate(base: Date, day: number): Date {
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  return setDate(base, Math.min(day, daysInMonth))
}

/** Current billing cycle [start, end] for a card with the given statement day, relative to today. */
export function currentCycle(statementDay: number, today: Date = new Date()) {
  const thisMonthStatement = safeSetDate(today, statementDay)
  const cycleEnd = isBefore(today, thisMonthStatement) ? thisMonthStatement : addMonths(thisMonthStatement, 1)
  const cycleStart = subMonths(cycleEnd, 1)
  return { cycleStart: addDays(cycleStart, 1), cycleEnd }
}

/** The due date for the cycle that just closed, given the statement day and due day. */
export function nextDueDate(statementDay: number, dueDay: number, today: Date = new Date()) {
  const thisMonthStatement = safeSetDate(today, statementDay)
  const lastClosedStatement = isBefore(today, thisMonthStatement)
    ? subMonths(thisMonthStatement, 1)
    : thisMonthStatement
  // Due day is typically in the month after the statement closes.
  let due = safeSetDate(addMonths(lastClosedStatement, 1), dueDay)
  if (isBefore(due, today)) {
    due = safeSetDate(addMonths(due, 1), dueDay)
  }
  return due
}
