import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Legend,
} from 'recharts'
import { CreditCard as CreditCardIcon, Target, Lightbulb, TrendingUp, TrendingDown, ChevronDown, PiggyBank } from 'lucide-react'
import { api, type Category, type CreditCard, type CreditCardPayment, type Expense, type Income, type IncomeAllocation } from '../lib/api'
import { useMonth, isInMonth } from '../lib/MonthContext'
import MonthSwitcher from '../components/MonthSwitcher'
import { getSavingsGoal } from '../lib/savingsGoal'
import { getBudgetCategories } from '../lib/budget'
import { computeCycleStatement } from '../lib/cardBalance'
import { computeMonthlyExpenseTotals } from '../lib/trend'
import { useMoneyFormatter } from '../lib/PrivacyContext'

const ALLOCATION_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899']
const TREND_RANGES = [
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
] as const

export default function Dashboard() {
  const fmt = useMoneyFormatter()
  const { selectedMonth } = useMonth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [income, setIncome] = useState<Income[]>([])
  const [cards, setCards] = useState<CreditCard[]>([])
  const [payments, setPayments] = useState<CreditCardPayment[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [allocations, setAllocations] = useState<IncomeAllocation[]>([])
  const [savingsGoal, setSavingsGoalState] = useState(0)
  const [budgetCategories, setBudgetCategoriesState] = useState(getBudgetCategories())
  const [trendMonths, setTrendMonths] = useState<3 | 6 | 12>(3)
  const [showSuggestedAllocation, setShowSuggestedAllocation] = useState(false)

  useEffect(() => {
    Promise.all([
      api.expenses.list(),
      api.income.list(),
      api.creditCards.list(),
      api.creditCardPayments.list(),
      api.categories.list(),
      api.incomeAllocations.list(),
    ]).then(([e, i, c, p, cat, alloc]) => {
      setExpenses(e)
      setIncome(i)
      setCards(c)
      setPayments(p)
      setCategories(cat)
      setAllocations(alloc)
    })
    setSavingsGoalState(getSavingsGoal())
    setBudgetCategoriesState(getBudgetCategories())
  }, [])

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Uncategorized'

  const monthExpenses = useMemo(
    () => expenses.filter((e) => isInMonth(e.expense_date, selectedMonth)),
    [expenses, selectedMonth],
  )
  const monthIncome = useMemo(
    () => income.filter((i) => isInMonth(i.income_date, selectedMonth)),
    [income, selectedMonth],
  )
  const monthPayments = useMemo(
    () => payments.filter((p) => isInMonth(p.payment_date, selectedMonth)),
    [payments, selectedMonth],
  )

  const totalIncome = monthIncome.reduce((sum, i) => sum + i.amount, 0)
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Cash-basis: only money that actually moved this month counts toward savings.
  // Credit card swipes are tracked (see "Committed on Cards") but don't reduce
  // savings until the bill is actually paid.
  const nonCardExpenses = monthExpenses.filter((e) => e.payment_method !== 'credit_card')
  const cardSwipesThisMonth = monthExpenses.filter((e) => e.payment_method === 'credit_card')
  const committedOnCards = cardSwipesThisMonth.reduce((sum, e) => sum + e.amount, 0)
  const cardPaymentsThisMonth = monthPayments.reduce((sum, p) => sum + p.amount, 0)
  const cashOutflow = nonCardExpenses.reduce((sum, e) => sum + e.amount, 0) + cardPaymentsThisMonth
  const netBalance = totalIncome - cashOutflow
  const savingsRate = totalIncome > 0 ? Math.max(0, (netBalance / totalIncome) * 100) : 0
  const goalProgress = savingsGoal > 0 ? Math.min(100, Math.max(0, (netBalance / savingsGoal) * 100)) : 0

  const cardBalances = cards.map((c) => ({ card: c, ...computeCycleStatement(c, expenses, payments) }))

  const byCategory = monthExpenses.reduce<Record<string, number>>((acc, e) => {
    const key = e.category_id ?? 'uncategorized'
    acc[key] = (acc[key] ?? 0) + e.amount
    return acc
  }, {})
  const spendingChartData = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([catId, amt]) => ({
      name: catId === 'uncategorized' ? 'Uncategorized' : categoryName(catId),
      amount: amt,
    }))

  const budgetTotal = budgetCategories.reduce((sum, b) => sum + b.percent, 0)
  const allocationData = budgetCategories.map((b) => ({
    name: b.name,
    percent: b.percent,
    value: (totalIncome * b.percent) / 100,
  }))

  const monthAllocations = useMemo(
    () => allocations.filter((a) => isInMonth(a.allocation_date, selectedMonth)),
    [allocations, selectedMonth],
  )
  const bucketedExpenses = useMemo(
    () => monthExpenses.filter((e) => e.category_id && categories.find((c) => c.id === e.category_id)?.budget_bucket),
    [monthExpenses, categories],
  )
  const totalAllocated =
    monthAllocations.reduce((sum, a) => sum + a.amount, 0) + bucketedExpenses.reduce((sum, e) => sum + e.amount, 0)
  const actualByBucket = monthAllocations.reduce<Record<string, number>>((acc, a) => {
    acc[a.bucket] = (acc[a.bucket] ?? 0) + a.amount
    return acc
  }, {})
  for (const e of bucketedExpenses) {
    const bucket = categories.find((c) => c.id === e.category_id)!.budget_bucket!
    actualByBucket[bucket] = (actualByBucket[bucket] ?? 0) + e.amount
  }
  const bucketNames = Array.from(new Set([...budgetCategories.map((b) => b.name), ...Object.keys(actualByBucket)]))
  const actualVsPlanned = bucketNames.map((name) => ({
    name,
    planned: (totalIncome * (budgetCategories.find((b) => b.name === name)?.percent ?? 0)) / 100,
    actual: actualByBucket[name] ?? 0,
  }))
  const unallocated = totalIncome - totalAllocated

  const trendData = useMemo(() => computeMonthlyExpenseTotals(expenses, trendMonths), [expenses, trendMonths])
  const trendAverage = trendData.length ? trendData.reduce((sum, m) => sum + m.total, 0) / trendData.length : 0
  const lastTwo = trendData.slice(-2)
  const monthOverMonthDelta =
    lastTwo.length === 2 && lastTwo[0].total > 0 ? ((lastTwo[1].total - lastTwo[0].total) / lastTwo[0].total) * 100 : null

  return (
    <div className="space-y-5 animate-in">
      <MonthSwitcher />

      <div className="rounded-3xl p-6 bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-900 shadow-lg shadow-brand-900/30 text-white">
        <p className="text-brand-100/80 text-sm">Saved This Month</p>
        <p className="text-4xl font-bold tracking-tight mt-1">{fmt(netBalance)}</p>
        <div className="flex gap-2 mt-5">
          <span className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" /> Income {fmt(totalIncome)}
          </span>
          <span className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-300" /> Cash-out {fmt(cashOutflow)}
          </span>
        </div>
        {totalIncome > 0 && (
          <p className="text-xs text-brand-100/70 mt-3">Savings rate: {savingsRate.toFixed(0)}% of income</p>
        )}
      </div>

      {savingsGoal > 0 && (
        <section className="bg-surface-2 rounded-2xl border border-white/5 p-5">
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="font-semibold flex items-center gap-1.5">
              <Target size={16} className="text-brand-400" /> Savings Goal
            </h2>
            <span className="text-xs text-slate-400">
              {fmt(Math.max(netBalance, 0))} / {fmt(savingsGoal)}
            </span>
          </div>
          <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${goalProgress >= 100 ? 'bg-brand-400' : 'bg-brand-600'}`}
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {goalProgress >= 100 ? "You've hit your savings goal this month!" : `${goalProgress.toFixed(0)}% of the way there`}
          </p>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Committed on Cards" value={fmt(committedOnCards)} accent="text-amber-400" />
        <Stat label="Cards Tracked" value={String(cards.length)} accent="text-brand-400" />
      </div>
      {committedOnCards > 0 && (
        <p className="text-xs text-slate-500 -mt-3 px-1">
          You've charged {fmt(committedOnCards)} to credit cards this month — it's counted in "Spending This Month"
          below, but won't reduce your savings until you pay the bill.
        </p>
      )}

      <section className="bg-surface-2 rounded-2xl border border-white/5 p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-1.5">
          <CreditCardIcon size={16} className="text-brand-400" /> Credit Cards
        </h2>
        <div className="space-y-4">
          {cardBalances.map(({ card: c, balance }) => {
            const util = c.credit_limit > 0 ? Math.min(100, Math.max(0, (balance / c.credit_limit) * 100)) : 0
            return (
              <div key={c.id} className="text-sm">
                <div className="flex justify-between mb-1.5">
                  <span className="font-medium text-slate-200">{c.bank_name}</span>
                  <span className="text-slate-400">{fmt(balance)} outstanding</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${util > 80 ? 'bg-red-500' : util > 50 ? 'bg-amber-400' : 'bg-brand-500'}`}
                    style={{ width: `${util}%` }}
                  />
                </div>
              </div>
            )
          })}
          {cards.length === 0 && <p className="text-sm text-slate-500">No credit cards yet.</p>}
        </div>
      </section>

      <section className="bg-surface-2 rounded-2xl border border-white/5 p-5">
        <h2 className="font-semibold mb-1">Spending This Month</h2>
        <p className="text-xs text-slate-500 mb-4">
          Total: {fmt(totalExpenses)} · includes credit card swipes the moment they're made
        </p>
        {spendingChartData.length === 0 ? (
          <p className="text-sm text-slate-500">No expenses logged this month.</p>
        ) : (
          <div style={{ width: '100%', height: Math.max(120, spendingChartData.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fill: '#cbd5e1', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => fmt(Number(value))}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ background: '#16211a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#e2e8f0' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {totalIncome > 0 && budgetTotal > 0 && (
        <section className="bg-surface-2 rounded-2xl border border-white/5 p-5">
          <button
            onClick={() => setShowSuggestedAllocation((v) => !v)}
            className="tap-shrink w-full flex items-center justify-between"
          >
            <h2 className="font-semibold flex items-center gap-1.5">
              <Lightbulb size={16} className="text-brand-400" /> Suggested Allocation
            </h2>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${showSuggestedAllocation ? 'rotate-180' : ''}`} />
          </button>
          {showSuggestedAllocation && (
            <>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Based on this month's income of {fmt(totalIncome)}. Adjust the plan in Settings.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-40 h-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                        {allocationData.map((_, i) => (
                          <Cell key={i} fill={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => fmt(Number(value))}
                        contentStyle={{ background: '#16211a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-2">
                  {allocationData.map((b, i) => (
                    <div key={b.name} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2 text-slate-300">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
                        />
                        {b.name} <span className="text-slate-500">({b.percent}%)</span>
                      </span>
                      <span className="font-medium text-slate-100">{fmt(b.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {budgetTotal !== 100 && (
                <p className="text-xs text-amber-400 mt-3">
                  Your allocation percentages add up to {budgetTotal}%, not 100 — adjust them in Settings.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {totalIncome > 0 && (
        <section className="bg-surface-2 rounded-2xl border border-white/5 p-5">
          <h2 className="font-semibold mb-1 flex items-center gap-1.5">
            <PiggyBank size={16} className="text-brand-400" /> Actual Allocation
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            {fmt(totalAllocated)} tracked this month ({fmt(monthAllocations.reduce((sum, a) => sum + a.amount, 0))} logged
            manually, {fmt(bucketedExpenses.reduce((sum, e) => sum + e.amount, 0))} from tagged expenses) ·{' '}
            {fmt(Math.max(unallocated, 0))} not yet allocated —{' '}
            <Link to="/allocations" className="text-brand-400 hover:text-brand-300">
              log it
            </Link>
          </p>
          {monthAllocations.length === 0 && bucketedExpenses.length === 0 ? (
            <p className="text-sm text-slate-500">
              No allocations tracked this month yet. Log a transfer on the Allocations page, or tag expense categories
              with a budget bucket in Settings.
            </p>
          ) : (
            <div style={{ width: '100%', height: Math.max(140, actualVsPlanned.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actualVsPlanned} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fill: '#cbd5e1', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => fmt(Number(value))}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    contentStyle={{ background: '#16211a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#e2e8f0' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="planned" name="Planned" fill="rgba(148,163,184,0.4)" radius={[0, 6, 6, 0]} barSize={12} />
                  <Bar dataKey="actual" name="Actual" fill="#10b981" radius={[0, 6, 6, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      <section className="bg-surface-2 rounded-2xl border border-white/5 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">Expense Trend</h2>
          <div className="flex gap-1">
            {TREND_RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setTrendMonths(r.months)}
                className={`tap-shrink text-xs font-medium px-2.5 py-1 rounded-full ${
                  trendMonths === r.months ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400 hover:text-slate-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {monthOverMonthDelta !== null && (
          <p className={`text-xs mb-3 flex items-center gap-1 ${monthOverMonthDelta > 0 ? 'text-red-400' : 'text-brand-400'}`}>
            {monthOverMonthDelta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(monthOverMonthDelta).toFixed(0)}% {monthOverMonthDelta > 0 ? 'higher' : 'lower'} than last month
          </p>
        )}
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ left: -20, right: 8, top: 8 }}>
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <ReferenceLine y={trendAverage} stroke="rgba(148,163,184,0.4)" strokeDasharray="4 4" />
              <Tooltip
                formatter={(value) => fmt(Number(value))}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{ background: '#16211a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} barSize={trendMonths > 6 ? 12 : 28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500 mt-2">Dashed line marks your {trendMonths}-month average.</p>
      </section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-surface-2 rounded-2xl border border-white/5 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${accent}`}>{value}</p>
    </div>
  )
}
