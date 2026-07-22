import { createContext, useContext, useState, type ReactNode } from 'react'
import { addMonths, format, startOfMonth } from 'date-fns'

interface MonthContextValue {
  selectedMonth: Date
  goToPrevMonth: () => void
  goToNextMonth: () => void
  goToCurrentMonth: () => void
  isCurrentMonth: boolean
}

const MonthContext = createContext<MonthContextValue | null>(null)

export function MonthProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()))

  const value: MonthContextValue = {
    selectedMonth,
    goToPrevMonth: () => setSelectedMonth((m) => addMonths(m, -1)),
    goToNextMonth: () => setSelectedMonth((m) => addMonths(m, 1)),
    goToCurrentMonth: () => setSelectedMonth(startOfMonth(new Date())),
    isCurrentMonth: format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM'),
  }

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>
}

export function useMonth() {
  const ctx = useContext(MonthContext)
  if (!ctx) throw new Error('useMonth must be used within MonthProvider')
  return ctx
}

export function isInMonth(dateStr: string, month: Date): boolean {
  return dateStr.slice(0, 7) === format(month, 'yyyy-MM')
}
