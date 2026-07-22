import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMonth } from '../lib/MonthContext'

export default function MonthSwitcher() {
  const { selectedMonth, goToPrevMonth, goToNextMonth, goToCurrentMonth, isCurrentMonth } = useMonth()

  return (
    <div className="flex items-center justify-between bg-surface-2 rounded-2xl border border-white/5 px-4 py-3">
      <button onClick={goToPrevMonth} className="tap-shrink text-slate-400 hover:text-slate-100 p-1">
        <ChevronLeft size={18} />
      </button>
      <div className="text-center">
        <p className="font-semibold text-slate-100">{format(selectedMonth, 'MMMM yyyy')}</p>
        {!isCurrentMonth && (
          <button onClick={goToCurrentMonth} className="tap-shrink text-xs text-brand-400 hover:text-brand-300">
            Back to this month
          </button>
        )}
      </div>
      <button onClick={goToNextMonth} className="tap-shrink text-slate-400 hover:text-slate-100 p-1">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
