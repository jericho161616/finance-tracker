import type { Account, Category, CreditCard } from './api'

const PAYMENT_METHODS = ['cash', 'debit', 'credit_card', 'ewallet', 'bank_transfer', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export type ParsedExpenseRow = {
  raw: string
  description: string
  amount: number | null
  method: PaymentMethod
  cardId: string
  accountId: string
  categoryId: string
  error?: string
}

const LINE_RE = /^(.+?)\s*[-–—]\s*([\d,]+(?:\.\d+)?)\s*(?:\((.+?)\))?\s*$/

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  groceries: ['palengke', 'market', 'supermarket', 'grocery', 'wet market', 'sari-sari', 'sari sari'],
  'convenience store': ['711', '7-11', '7 eleven', 'ministop', 'family mart', 'familymart', 'alfamart'],
  'dining out': [
    'restaurant',
    'panda',
    'manok',
    'jollibee',
    'mcdo',
    'kfc',
    'sukiya',
    'foodpanda',
    'food panda',
    'grab food',
    'grabfood',
    'cafe',
    'coffee',
    'starbucks',
  ],
  transportation: ['grab', 'taxi', 'gas', 'gasoline', 'toll', 'parking', 'jeep', 'bus', 'train', 'mrt', 'lrt'],
  utilities: ['meralco', 'water bill', 'electric', 'internet', 'wifi', 'globe', 'smart', 'pldt'],
  shopping: ['shopee', 'lazada', 'mall', 'store'],
}

function guessCategoryId(description: string, categories: Category[]): string {
  const desc = description.toLowerCase()

  const byName = categories.find((c) => desc.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(desc))
  if (byName) return byName.id

  for (const [catKeyword, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => desc.includes(k))) {
      const match = categories.find((c) => c.name.toLowerCase().includes(catKeyword))
      if (match) return match.id
    }
  }

  return ''
}

function guessPaymentMethod(
  tag: string,
  cards: CreditCard[],
  accounts: Account[],
): { method: PaymentMethod; cardId: string; accountId: string } {
  const t = tag.toLowerCase().trim()

  if (!t || /\bcash\b/.test(t)) return { method: 'cash', cardId: '', accountId: '' }

  const isCreditCard = /\bcc\b/.test(t) || t.includes('credit')
  if (isCreditCard) {
    const bankPart = t.replace(/\bcc\b|\bcredit card\b|\bcredit\b/g, '').trim()
    const card = cards.find(
      (c) => bankPart && (c.bank_name.toLowerCase().includes(bankPart) || bankPart.includes(c.bank_name.toLowerCase())),
    )
    return { method: 'credit_card', cardId: card?.id ?? '', accountId: '' }
  }

  if (t.includes('gcash') || t.includes('maya') || t.includes('paymaya') || t.includes('ewallet') || t.includes('e-wallet')) {
    const account = accounts.find((a) => t.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(t))
    return { method: 'ewallet', cardId: '', accountId: account?.id ?? '' }
  }

  if (t.includes('bank') || t.includes('transfer')) {
    const account = accounts.find((a) => t.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(t))
    return { method: 'bank_transfer', cardId: '', accountId: account?.id ?? '' }
  }

  if (t.includes('debit')) {
    const account = accounts.find((a) => t.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(t))
    return { method: 'debit', cardId: '', accountId: account?.id ?? '' }
  }

  const account = accounts.find((a) => t.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(t))
  if (account) return { method: 'debit', cardId: '', accountId: account.id }

  return { method: 'other', cardId: '', accountId: '' }
}

export function parseExpenseText(
  text: string,
  categories: Category[],
  cards: CreditCard[],
  accounts: Account[],
): ParsedExpenseRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((raw) => {
      const match = raw.match(LINE_RE)
      if (!match) {
        return {
          raw,
          description: raw,
          amount: null,
          method: 'cash' as PaymentMethod,
          cardId: '',
          accountId: '',
          categoryId: '',
          error: "Couldn't parse this line. Expected format: \"Merchant - Amount (Payment method)\"",
        }
      }
      const [, descRaw, amountRaw, tagRaw] = match
      const description = descRaw.trim()
      const amount = Number(amountRaw.replace(/,/g, ''))
      const { method, cardId, accountId } = guessPaymentMethod(tagRaw ?? '', cards, accounts)
      const categoryId = guessCategoryId(description, categories)

      return { raw, description, amount, method, cardId, accountId, categoryId }
    })
}
