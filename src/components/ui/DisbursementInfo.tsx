'use client'

import { useMemo } from 'react'
import { Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Loan } from '@/types'
import {
  formatDisbursementDate,
  formatDueDate,
  getFirstDueDate,
  generateDueSchedule,
} from '@/lib/dueSchedule'

interface DisbursementInfoProps {
  loan: Partial<Loan> | any
  variant?: 'compact' | 'full' | 'timeline' | 'table-cell'
  className?: string
}

export default function DisbursementInfo({
  loan,
  variant = 'compact',
  className = '',
}: DisbursementInfoProps) {
  const disbursementDate = loan.disbursement_date
  const hasDisbursement = Boolean(disbursementDate)

  const firstDueDate = useMemo(() => {
    if (!hasDisbursement) return null
    return getFirstDueDate(disbursementDate, loan.weekly_batch || 'tuesday')
  }, [disbursementDate, loan.weekly_batch, hasDisbursement])

  const dueSchedule = useMemo(() => {
    if (!hasDisbursement) return []
    return generateDueSchedule(
      disbursementDate,
      loan.weekly_batch || 'tuesday',
      loan.number_of_weeks || 15
    )
  }, [disbursementDate, loan.weekly_batch, loan.number_of_weeks, hasDisbursement])

  const lastDueDate = dueSchedule.length > 0 ? dueSchedule[dueSchedule.length - 1] : null

  // Batch day badge styling
  const batchDay = (loan.weekly_batch || 'tuesday').toLowerCase()
  const batchBadgeClass =
    batchDay === 'thursday'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : batchDay === 'friday'
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : 'bg-blue-100 text-blue-800 border-blue-200'

  // Variant 1: Table Cell
  if (variant === 'table-cell') {
    if (!hasDisbursement) {
      return (
        <span
          className="text-slate-400 font-normal italic text-[11px]"
          title="Disbursement date not recorded for this loan"
        >
          Not recorded
        </span>
      )
    }
    return (
      <div className={`flex flex-col text-xs ${className}`}>
        <span className="font-bold text-slate-800 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-primary-600 flex-shrink-0" />
          {formatDisbursementDate(disbursementDate)}
        </span>
        {firstDueDate && (
          <span className="text-[10px] text-slate-500 font-medium">
            1st Due: {formatDueDate(firstDueDate)}
          </span>
        )}
      </div>
    )
  }

  // Variant 2: Compact Pill
  if (variant === 'compact') {
    if (!hasDisbursement) {
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500 text-xs ${className}`}
          title="Disbursement date not recorded for this loan"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Disbursed: Not recorded</span>
        </div>
      )
    }

    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 font-bold ${className}`}
      >
        <Calendar className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
        <span>Disbursed: {formatDisbursementDate(disbursementDate)}</span>
        {firstDueDate && (
          <>
            <span className="text-indigo-300">•</span>
            <span className="text-indigo-700 font-semibold">
              First Due: {formatDueDate(firstDueDate)}
            </span>
          </>
        )}
      </div>
    )
  }

  // Variant 3: Timeline Strip
  if (variant === 'timeline') {
    if (!hasDisbursement) return null

    return (
      <div className={`p-3.5 rounded-2xl bg-slate-50 border border-slate-200 ${className}`}>
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
          <span>Loan Cycle Timeline</span>
          <span className="text-primary-700 capitalize">
            {batchDay} Batch ({dueSchedule.length} Weekly Dues)
          </span>
        </div>

        <div className="relative flex items-center justify-between">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />

          {/* Node 1: Disbursed */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-sm">
              <Calendar className="w-3 h-3" />
            </div>
            <span className="text-[10px] font-extrabold text-slate-800 mt-1">Disbursed</span>
            <span className="text-[10px] text-slate-500 font-medium">
              {formatDisbursementDate(disbursementDate)}
            </span>
          </div>

          {/* Node 2: First Due */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-3 h-3" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-800 mt-1">1st Due</span>
            <span className="text-[10px] text-slate-500 font-medium">
              {formatDueDate(firstDueDate)}
            </span>
          </div>

          {/* Node 3: Last Due */}
          {lastDueDate && (
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center shadow-sm">
                <Clock className="w-3 h-3" />
              </div>
              <span className="text-[10px] font-extrabold text-slate-800 mt-1">Last Due</span>
              <span className="text-[10px] text-slate-500 font-medium">
                {formatDueDate(lastDueDate)}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Variant 4: Full Card View (Used in Modals and Drawer Loan Overview)
  return (
    <div className={`p-4.5 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3.5 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-primary-600" />
          Disbursement & Due Schedule
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${batchBadgeClass}`}
        >
          {batchDay} Batch
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-slate-400 block text-[11px] font-bold">Disbursement Date</span>
          {hasDisbursement ? (
            <strong className="text-slate-900 font-extrabold text-sm block mt-0.5">
              {formatDisbursementDate(disbursementDate)}
            </strong>
          ) : (
            <span
              className="text-slate-400 italic font-medium"
              title="Disbursement date not recorded for this loan"
            >
              Not recorded
            </span>
          )}
        </div>

        <div>
          <span className="text-slate-400 block text-[11px] font-bold">First Due Date</span>
          {firstDueDate ? (
            <strong className="text-emerald-700 font-extrabold text-sm block mt-0.5">
              {formatDueDate(firstDueDate)}
            </strong>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>

        <div>
          <span className="text-slate-400 block text-[11px] font-bold">Last Due Date</span>
          {lastDueDate ? (
            <strong className="text-slate-800 font-extrabold text-sm block mt-0.5">
              {formatDueDate(lastDueDate)}
            </strong>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
      </div>

      {/* Mini timeline if loan has disbursement date */}
      {hasDisbursement && (
        <div className="pt-2">
          <DisbursementInfo loan={loan} variant="timeline" />
        </div>
      )}
    </div>
  )
}

