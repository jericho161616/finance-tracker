import { useEffect, useState } from 'react'
import { api, type Account, type Category, type CreditCard } from '../lib/api'
import { card, input, button } from '../lib/ui'

export default function Settings() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<CreditCard[]>([])

  const [accName, setAccName] = useState('')
  const [accType, setAccType] = useState('savings')

  const [catName, setCatName] = useState('')
  const [catKind, setCatKind] = useState<'expense' | 'income'>('expense')

  const [cardBank, setCardBank] = useState('')
  const [cardLimit, setCardLimit] = useState(50000)
  const [cardStmtDay, setCardStmtDay] = useState(15)
  const [cardDueDay, setCardDueDay] = useState(5)

  async function refresh() {
    setAccounts(await api.accounts.list())
    setCategories(await api.categories.list())
    setCards(await api.creditCards.list())
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="space-y-5 animate-in">
      <section className={card}>
        <h2 className="font-semibold mb-4">🏦 Accounts (cash / savings / e-wallet)</h2>
        <form
          className="flex flex-wrap gap-2 mb-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!accName.trim()) return
            await api.accounts.create({ name: accName.trim(), type: accType })
            setAccName('')
            refresh()
          }}
        >
          <input
            placeholder="e.g. BPI Savings"
            value={accName}
            onChange={(e) => setAccName(e.target.value)}
            className={`${input} flex-1 min-w-[160px]`}
          />
          <select value={accType} onChange={(e) => setAccType(e.target.value)} className={input}>
            <option value="savings">Savings</option>
            <option value="cash">Cash</option>
            <option value="ewallet">E-Wallet</option>
          </select>
          <button className={button}>Add</button>
        </form>
        <ul className="divide-y divide-white/5">
          {accounts.map((a) => (
            <li key={a.id} className="py-2.5 flex justify-between items-center text-sm">
              <span className="text-slate-200">
                {a.name} <span className="text-slate-500">({a.type})</span>
              </span>
              <button
                onClick={async () => {
                  await api.accounts.remove(a.id)
                  refresh()
                }}
                className="tap-shrink text-red-400 hover:text-red-300 text-xs"
              >
                Remove
              </button>
            </li>
          ))}
          {accounts.length === 0 && <p className="text-sm text-slate-500 py-2">No accounts yet.</p>}
        </ul>
      </section>

      <section className={card}>
        <h2 className="font-semibold mb-4">🏷️ Categories</h2>
        <form
          className="flex flex-wrap gap-2 mb-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!catName.trim()) return
            await api.categories.create({ name: catName.trim(), kind: catKind })
            setCatName('')
            refresh()
          }}
        >
          <input
            placeholder="e.g. Groceries"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            className={`${input} flex-1 min-w-[160px]`}
          />
          <select
            value={catKind}
            onChange={(e) => setCatKind(e.target.value as 'expense' | 'income')}
            className={input}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <button className={button}>Add</button>
        </form>
        <ul className="divide-y divide-white/5">
          {categories.map((c) => (
            <li key={c.id} className="py-2.5 flex justify-between items-center text-sm">
              <span className="text-slate-200">
                {c.name} <span className="text-slate-500">({c.kind})</span>
              </span>
              <button
                onClick={async () => {
                  await api.categories.remove(c.id)
                  refresh()
                }}
                className="tap-shrink text-red-400 hover:text-red-300 text-xs"
              >
                Remove
              </button>
            </li>
          ))}
          {categories.length === 0 && <p className="text-sm text-slate-500 py-2">No categories yet.</p>}
        </ul>
      </section>

      <section className={card}>
        <h2 className="font-semibold mb-4">💳 Credit Cards</h2>
        <form
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!cardBank.trim()) return
            await api.creditCards.create({
              bank_name: cardBank.trim(),
              credit_limit: cardLimit,
              statement_day: cardStmtDay,
              due_day: cardDueDay,
            })
            setCardBank('')
            refresh()
          }}
        >
          <input
            placeholder="Bank / Card name"
            value={cardBank}
            onChange={(e) => setCardBank(e.target.value)}
            className={`${input} col-span-2 sm:col-span-1`}
          />
          <input
            type="number"
            min={0}
            step={1000}
            value={cardLimit}
            onChange={(e) => setCardLimit(Number(e.target.value))}
            placeholder="Credit Limit"
            className={input}
          />
          <input
            type="number"
            min={1}
            max={31}
            value={cardStmtDay}
            onChange={(e) => setCardStmtDay(Number(e.target.value))}
            placeholder="Statement Day"
            className={input}
          />
          <input
            type="number"
            min={1}
            max={31}
            value={cardDueDay}
            onChange={(e) => setCardDueDay(Number(e.target.value))}
            placeholder="Due Day"
            className={input}
          />
          <button className={`${button} col-span-2 sm:col-span-4`}>Add Card</button>
        </form>
        <ul className="divide-y divide-white/5">
          {cards.map((c) => (
            <li key={c.id} className="py-2.5 flex justify-between items-center text-sm gap-2">
              <span className="text-slate-200">
                {c.bank_name} — limit ₱{c.credit_limit.toLocaleString()}, statement day {c.statement_day}, due day{' '}
                {c.due_day}
              </span>
              <button
                onClick={async () => {
                  await api.creditCards.remove(c.id)
                  refresh()
                }}
                className="tap-shrink text-red-400 hover:text-red-300 text-xs shrink-0"
              >
                Remove
              </button>
            </li>
          ))}
          {cards.length === 0 && <p className="text-sm text-slate-500 py-2">No cards yet.</p>}
        </ul>
      </section>
    </div>
  )
}
