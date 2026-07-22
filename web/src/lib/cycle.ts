import { setDate, addMonths, subMonths, isBefore, addDays } from 'date-fns'

/** Clamp a target day-of-month to a valid date within that month (e.g. day 31 in Feb). */
function safeSetDate(base: Date, day: number): Date {
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  return setDate(base, Math.min(day, daysInMonth))
}

/**
 * Billing cycle [start, end] for a card with the given statement day.
 * `offset` shifts by whole cycles from the current one: 0 = current (still open),
 * -1 = previous (already closed), +1 = next.
 */
export function getCycle(statementDay: number, offset: number = 0, today: Date = new Date()) {
  const thisMonthStatement = safeSetDate(today, statementDay)
  let cycleEnd = isBefore(today, thisMonthStatement) ? thisMonthStatement : addMonths(thisMonthStatement, 1)
  cycleEnd = addMonths(cycleEnd, offset)
  const cycleStart = subMonths(cycleEnd, 1)
  return { cycleStart: addDays(cycleStart, 1), cycleEnd }
}

/** The due date for a cycle ending on cycleEnd — always due_day in the following month. */
export function getDueDate(cycleEnd: Date, dueDay: number) {
  return safeSetDate(addMonths(cycleEnd, 1), dueDay)
}
