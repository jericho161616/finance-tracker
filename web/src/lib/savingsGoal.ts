const KEY = 'finance_tracker_savings_goal'

export function getSavingsGoal(): number {
  const raw = localStorage.getItem(KEY)
  return raw ? Number(raw) : 0
}

export function setSavingsGoal(amount: number) {
  localStorage.setItem(KEY, String(amount))
}
