import { api } from './api'

const DEFAULT_EXPENSE_CATEGORIES = ['Food', 'Utilities', 'Transport', 'Shopping', 'Entertainment', 'Other']
const DEFAULT_INCOME_CATEGORIES = ['Salary', 'Business', 'Freelance', 'Gift', 'Other']

/** Seeds default expense/income categories once, if the user has none yet. */
export async function seedDefaultCategoriesIfEmpty() {
  const existing = await api.categories.list()
  if (existing.length > 0) return

  await Promise.all([
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => api.categories.create({ name, kind: 'expense' })),
    ...DEFAULT_INCOME_CATEGORIES.map((name) => api.categories.create({ name, kind: 'income' })),
  ])
}
