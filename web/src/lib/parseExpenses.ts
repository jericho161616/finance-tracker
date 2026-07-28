import type { Account, Category, CreditCard } from './api'

const PAYMENT_METHODS = ['cash', 'debit', 'credit_card', 'ewallet', 'bank_transfer', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export type ParsedExpenseRow = {
  raw: string
  date: string
  description: string
  amount: number | null
  method: PaymentMethod
  cardId: string
  accountId: string
  categoryId: string
  error?: string
}

// Description, then a separator (space and/or dash), then an amount (optionally
// signed), then an optional trailing tag — with or without parentheses. Lazy
// backtracking on the description means it still finds the right split even when
// the merchant name itself contains a dash (e.g. "7-Eleven - 100 Cash").
const AMOUNT_TAG_RE = /^(.*?)[\s\-–—]+(-?[\d,]+(?:\.\d+)?)[\s\-–—]*\(?\s*([^()]*?)\s*\)?$/

function parseLeadingDate(line: string, defaultDate: string): { date: string; rest: string } | null {
  const defaultYear = Number(defaultDate.slice(0, 4)) || new Date().getFullYear()
  let m: RegExpMatchArray | null

  // 2026-07-29 / 2026/07/29
  if ((m = line.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+(.*)$/))) {
    return { date: `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`, rest: m[4] }
  }
  // 7/29/2026 or 7-29-26
  if ((m = line.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s+(.*)$/))) {
    const year = m[3].length === 4 ? Number(m[3]) : 2000 + Number(m[3])
    return { date: `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`, rest: m[4] }
  }
  // 7-29 or 7/29 (year inferred from the default date)
  if ((m = line.match(/^(\d{1,2})[/-](\d{1,2})\s+(.*)$/))) {
    return { date: `${defaultYear}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`, rest: m[3] }
  }
  // 0729 — no separator at all, exactly MMDD
  if ((m = line.match(/^(\d{4})\s+(.*)$/))) {
    const mm = m[1].slice(0, 2)
    const dd = m[1].slice(2, 4)
    if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
      return { date: `${defaultYear}-${mm}-${dd}`, rest: m[2] }
    }
  }
  return null
}

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
  if (account) return { method: account.type === 'ewallet' ? 'ewallet' : 'debit', cardId: '', accountId: account.id }

  return { method: 'other', cardId: '', accountId: '' }
}

export function parseExpenseText(
  text: string,
  categories: Category[],
  cards: CreditCard[],
  accounts: Account[],
  defaultDate: string,
): ParsedExpenseRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((raw) => {
      const leading = parseLeadingDate(raw, defaultDate)
      const date = leading?.date ?? defaultDate
      const lineToMatch = (leading?.rest ?? raw).replace(/^[\s\-–—]+/, '')

      const match = lineToMatch.match(AMOUNT_TAG_RE)
      if (!match) {
        return {
          raw,
          date,
          description: lineToMatch,
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

      return { raw, date, description, amount, method, cardId, accountId, categoryId }
    })
}
