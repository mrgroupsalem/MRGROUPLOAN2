'use client'

import React from 'react'
import { Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { DueBreakdownItem } from '@/lib/pendingBreakdown'

interface PendingDueListProps {
  items: DueBreakdownItem[]
  selectable?: boolean
  selectedDates?: Set<string>
  onToggleDate?: (dueDate: string) => void
  amounts?: Record<string, number>
  onAmountChange?: (dueDate: string, newAmount: number) => void
  showFooter?: boolean
  className?: string
}

export default function PendingDueList({
  items,
  selectable = false,
  selectedDates,
  onToggleDate,
  amounts,
  onAmountChange,
  showFooter = true,
  className = '',
}: PendingDueListProps) {
  // Only show pending items (or all if filtered already)
  const pendingItems = items.filter((item) => item.pending > 0 || (amounts && (amounts[item.dueDate] || 0) > 0))

  if (pendingItems.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
        No pending dues. All payments are up to date!
      </div>
    )
  }

  // Summary calculations
  const currentDueItem = pendingItems.find((i) => i.status === 'due_today')
  const overdueItems = pendingItems.filter((i) => i.status === 'overdue')
  const currentEmiTotal = currentDueItem ? (amounts ? amounts[currentDueItem.dueDate] ?? currentDueItem.pending : currentDueItem.pending) : 0
  const overdueTotal = overdueItems.reduce(
    (sum, i) => sum + (amounts ? amounts[i.dueDate] ?? i.pending : i.pending),
    0
  )
  const grandTotal = currentEmiTotal + overdueTotal
  const missedWeeksCount = overdueItems.length

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Date-wise items list */}
      <div className="space-y-2">
        {pendingItems.map((item) => {
          const isSelected = selectedDates ? selectedDates.has(item.dueDate) : true
          const currentAmt = amounts && amounts[item.dueDate] !== undefined ? amounts[item.dueDate] : item.pending

          // Status Badge styling
          let badgeClass = 'bg-blue-100 text-blue-800 border-blue-200'
          let badgeLabel = 'Due Today'
          if (item.status === 'overdue') {
            if (item.weeksOverdue >= 3) {
              badgeClass = 'bg-rose-100 text-rose-800 border-rose-200 font-black'
              badgeLabel = `Overdue ${item.weeksOverdue} wks`
            } else {
              badgeClass = 'bg-amber-100 text-amber-800 border-amber-200'
              badgeLabel = `Overdue ${item.weeksOverdue} wk`
            }
          }

          return (
            <div
              key={item.dueDate}
              onClick={() => selectable && onToggleDate && onToggleDate(item.dueDate)}
              className={`p-3 rounded-2xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                selectable
                  ? isSelected
                    ? 'bg-primary-50/60 border-primary-300 shadow-xs cursor-pointer'
                    : 'bg-white/80 border-slate-200 opacity-60 hover:opacity-100 cursor-pointer'
                  : 'bg-white border-slate-200/80 shadow-xs'
              }`}
            >
              {/* Left: Checkbox (if selectable) + Date & Week info */}
              <div className="flex items-center gap-3">
                {selectable && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation()
                      onToggleDate && onToggleDate(item.dueDate)
                    }}
                    className="w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                  />
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                      {item.formattedDate}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {item.weekLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>EMI: {formatCurrency(item.emi)}</span>
                    {item.paid > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 font-semibold">
                          Paid: {formatCurrency(item.paid)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Status Badge & Pending / Editable Amount */}
              <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeClass}`}
                >
                  {badgeLabel}
                </span>

                {selectable && onAmountChange ? (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] text-slate-400 font-medium">₹</span>
                    <input
                      type="number"
                      value={currentAmt}
                      min={1}
                      max={item.pending}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(item.pending, Number(e.target.value) || 0))
                        onAmountChange(item.dueDate, val)
                      }}
                      className="w-24 px-2 py-1 text-right font-black text-slate-900 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                ) : (
                  <span className="font-black text-rose-600 text-xs sm:text-sm">
                    {formatCurrency(item.pending)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Totals */}
      {showFooter && (
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1.5 mt-3">
          <div className="flex items-center justify-between text-slate-600 text-[11px]">
            <span>Current Cycle EMI:</span>
            <strong className="text-slate-900">{formatCurrency(currentEmiTotal)}</strong>
          </div>
          {overdueTotal > 0 && (
            <div className="flex items-center justify-between text-slate-600 text-[11px]">
              <span>Previous Overdue ({missedWeeksCount} missed {missedWeeksCount === 1 ? 'week' : 'weeks'}):</span>
              <strong className="text-rose-600">{formatCurrency(overdueTotal)}</strong>
            </div>
          )}
          <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-black text-xs sm:text-sm">
            <span className="text-slate-900">Total Pending:</span>
            <span className="text-rose-600">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

