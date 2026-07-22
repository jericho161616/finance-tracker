export interface BudgetCategory {
  name: string
  percent: number
}

const KEY = 'finance_tracker_budget_categories'

export const DEFAULT_BUDGET: BudgetCategory[] = [
  { name: 'Bills', percent: 20 },
  { name: 'Emergency Fund', percent: 30 },
  { name: 'Savings', percent: 14 },
  { name: 'Investments', percent: 8 },
  { name: 'Wants', percent: 28 },
]

export function getBudgetCategories(): BudgetCategory[] {
  const raw = localStorage.getItem(KEY)
  if (!raw) return DEFAULT_BUDGET
  try {
    return JSON.parse(raw)
  } catch {
    return DEFAULT_BUDGET
  }
}

export function setBudgetCategories(categories: BudgetCategory[]) {
  localStorage.setItem(KEY, JSON.stringify(categories))
}
