import { useEffect, useState } from 'react'
import { Target, Lightbulb, Landmark, Tag, CreditCard as CreditCardIcon, X } from 'lucide-react'
import { api, type Account, type Category, type CreditCard } from '../lib/api'
import { card, input, button, secondaryButton, label as labelClass } from '../lib/ui'
import { getSavingsGoal, setSavingsGoal } from '../lib/savingsGoal'
import { getBudgetCategories, setBudgetCategories, type BudgetCategory } from '../lib/budget'

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

  const [goal, setGoal] = useState(0)
  const [goalSaved, setGoalSaved] = useState(false)

  const [budget, setBudget] = useState<BudgetCategory[]>([])
  const [budgetSaved, setBudgetSaved] = useState(false)

  async function refresh() {
    setAccounts(await api.accounts.list())
    setCategories(await api.categories.list())
    setCards(await api.creditCards.list())
  }

  useEffect(() => {
    refresh()
    setGoal(getSavingsGoal())
    setBudget(getBudgetCategories())
  }, [])

  const budgetTotal = budget.reduce((sum, b) => sum + b.percent, 0)

  return (
    <div className="space-y-5 animate-in">
      <section className={card}>
        <h2 className="font-semibold mb-1 flex items-center gap-1.5">
          <Target size={16} className="text-brand-400" /> Monthly Savings Goal
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Set how much you want to save each month. The Dashboard will show your progress toward this.
        </p>
        <form
          className="flex flex-wrap gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault()
            setSavingsGoal(goal)
            setGoalSaved(true)
            setTimeout(() => setGoalSaved(false), 1500)
          }}
        >
          <div className="flex-1 min-w-[160px]">
            <label className={labelClass}>Target amount (₱ / month)</label>
            <input
              type="number"
              min={0}
              step={500}
              value={goal || ''}
              onChange={(e) => setGoal(Number(e.target.value))}
              className={`${input} w-full`}
            />
          </div>
          <button className={button}>{goalSaved ? 'Saved ✓' : 'Save Goal'}</button>
        </form>
      </section>

      <section className={card}>
        <h2 className="font-semibold mb-1 flex items-center gap-1.5">
          <Lightbulb size={16} className="text-brand-400" /> Budget Allocation Plan
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Define how your income should be split. The Dashboard uses this to suggest an allocation each month.
        </p>
        <div className="space-y-2 mb-3">
          {budget.map((b, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={b.name}
                onChange={(e) =>
                  setBudget((rows) => rows.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)))
                }
                className={`${input} flex-1`}
                placeholder="Category name"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={b.percent || ''}
                onChange={(e) =>
                  setBudget((rows) =>
                    rows.map((r, idx) => (idx === i ? { ...r, percent: Number(e.target.value) } : r)),
                  )
                }
                className={`${input} w-20 text-right`}
              />
              <span className="text-slate-500 text-sm">%</span>
              <button
                onClick={() => setBudget((rows) => rows.filter((_, idx) => idx !== i))}
                className="tap-shrink inline-flex text-red-400 hover:text-red-300 px-1"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => setBudget((rows) => [...rows, { name: '', percent: 0 }])}
            className={secondaryButton}
          >
            + Add Category
          </button>
          <button
            type="button"
            onClick={() => {
              setBudgetCategories(budget)
              setBudgetSaved(true)
              setTimeout(() => setBudgetSaved(false), 1500)
            }}
            className={button}
          >
            {budgetSaved ? 'Saved ✓' : 'Save Plan'}
          </button>
          <span className={`text-xs ${budgetTotal === 100 ? 'text-slate-500' : 'text-amber-400'}`}>
            Total: {budgetTotal}% {budgetTotal !== 100 && '(should be 100%)'}
          </span>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-semibold mb-4 flex items-center gap-1.5">
          <Landmark size={16} className="text-brand-400" /> Accounts (cash / savings / e-wallet)
        </h2>
        <form
          className="flex flex-wrap gap-2 mb-4 items-end"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!accName.trim()) return
            await api.accounts.create({ name: accName.trim(), type: accType })
            setAccName('')
            refresh()
          }}
        >
          <div className="flex-1 min-w-[160px]">
            <label className={labelClass}>Account Name</label>
            <input
              placeholder="e.g. BPI Savings"
              value={accName}
              onChange={(e) => setAccName(e.target.value)}
              className={`${input} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select value={accType} onChange={(e) => setAccType(e.target.value)} className={input}>
              <option value="savings">Savings</option>
              <option value="cash">Cash</option>
              <option value="ewallet">E-Wallet</option>
            </select>
          </div>
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
        <h2 className="font-semibold mb-4 flex items-center gap-1.5">
          <Tag size={16} className="text-brand-400" /> Categories
        </h2>
        <form
          className="flex flex-wrap gap-2 mb-4 items-end"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!catName.trim()) return
            await api.categories.create({ name: catName.trim(), kind: catKind })
            setCatName('')
            refresh()
          }}
        >
          <div className="flex-1 min-w-[160px]">
            <label className={labelClass}>Category Name</label>
            <input
              placeholder="e.g. Groceries"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className={`${input} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Applies To</label>
            <select
              value={catKind}
              onChange={(e) => setCatKind(e.target.value as 'expense' | 'income')}
              className={input}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
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
        <h2 className="font-semibold mb-4 flex items-center gap-1.5">
          <CreditCardIcon size={16} className="text-brand-400" /> Credit Cards
        </h2>
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
          <div className="col-span-2 sm:col-span-1">
            <label className={labelClass}>Bank / Card Name</label>
            <input
              placeholder="e.g. BPI Mastercard"
              value={cardBank}
              onChange={(e) => setCardBank(e.target.value)}
              className={`${input} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Credit Limit</label>
            <input
              type="number"
              min={0}
              step={1000}
              value={cardLimit}
              onChange={(e) => setCardLimit(Number(e.target.value))}
              className={`${input} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Statement Day</label>
            <input
              type="number"
              min={1}
              max={31}
              value={cardStmtDay}
              onChange={(e) => setCardStmtDay(Number(e.target.value))}
              className={`${input} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Due Day</label>
            <input
              type="number"
              min={1}
              max={31}
              value={cardDueDay}
              onChange={(e) => setCardDueDay(Number(e.target.value))}
              className={`${input} w-full`}
            />
          </div>
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
