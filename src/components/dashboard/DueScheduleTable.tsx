'use client'

import React, { useState, useMemo } from 'react'
import { Loan, Collection, Employee } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { getFullDueSchedule, DueScheduleItem } from '@/lib/pendingBreakdown'
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Filter,
  User,
  CreditCard,
} from 'lucide-react'

interface DueScheduleTableProps {
  loan: Loan
  collections: Collection[]
  employees?: Employee[]
}

type FilterOption = 'all' | 'paid' | 'pending' | 'overdue'

export default function DueScheduleTable({
  loan,
  collections,
  employees = [],
}: DueScheduleTableProps) {
  const [filter, setFilter] = useState<FilterOption>('all')

  const schedule = useMemo(() => {
    return getFullDueSchedule(loan, collections, employees)
  }, [loan, collections, employees])

  // Filtered schedule
  const filteredSchedule = useMemo(() => {
    if (filter === 'paid') return schedule.filter((s) => s.status === 'Paid')
    if (filter === 'pending')
      return schedule.filter((s) => s.status === 'Pending' || s.status === 'Partial')
    if (filter === 'overdue') return schedule.filter((s) => s.status === 'Overdue')
    return schedule
  }, [schedule, filter])

  // Aggregate totals
  const totals = useMemo(() => {
    const totalEmi = schedule.reduce((sum, s) => sum + s.emi, 0)
    const totalPaid = schedule.reduce((sum, s) => sum + s.paid, 0)
    const totalPending = schedule.reduce((sum, s) => sum + s.pending, 0)
    const paidCount = schedule.filter((s) => s.status === 'Paid').length
    const pendingCount = schedule.filter((s) => s.pending > 0 && s.status !== 'Upcoming').length
    const overdueCount = schedule.filter((s) => s.status === 'Overdue').length
    const skippedCount = schedule.filter((s) => s.isSkipped).length

    return { totalEmi, totalPaid, totalPending, paidCount, pendingCount, overdueCount, skippedCount }
  }, [schedule])

  const renderStatusChip = (item: DueScheduleItem) => {
    switch (item.status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Paid
          </span>
        )
      case 'Partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Partial
          </span>
        )
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Overdue {item.weeksOverdue > 1 ? `(${item.weeksOverdue} wks)` : '(1 wk)'}
          </span>
        )
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <Clock className="w-3 h-3 text-orange-600" />
            Pending
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            Upcoming
          </span>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-600" />
            Full Due Schedule & Payments Breakdown
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {schedule.length} weeks tenure · {totals.paidCount} paid · {totals.pendingCount} pending
            {totals.skippedCount > 0 && (
              <span className="ml-1 text-rose-600 font-bold">
                ({totals.skippedCount} skipped older dues)
              </span>
            )}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All ({schedule.length})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filter === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-emerald-700'
            }`}
          >
            Paid ({totals.paidCount})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filter === 'pending'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-500 hover:text-orange-700'
            }`}
          >
            Pending ({totals.pendingCount})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filter === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-rose-700'
            }`}
          >
            Overdue ({totals.overdueCount})
          </button>
        </div>
      </div>

      {/* DESKTOP TABLE VIEW (hidden on mobile) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-3.5">Due Date</th>
                <th className="py-3 px-3.5 text-right">EMI</th>
                <th className="py-3 px-3.5 text-right">Paid</th>
                <th className="py-3 px-3.5 text-right">PENDING</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5">Collected On</th>
                <th className="py-3 px-3.5">Mode</th>
                <th className="py-3 px-3.5">Collected By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {filteredSchedule.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No due records match filter "{filter}".
                  </td>
                </tr>
              ) : (
                filteredSchedule.map((item) => (
                  <tr
                    key={item.dueDate}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      item.isSkipped
                        ? 'border-l-4 border-l-rose-500 bg-rose-50/30'
                        : item.status === 'Overdue'
                        ? 'bg-rose-50/15'
                        : ''
                    }`}
                  >
                    {/* Due Date & Week Label */}
                    <td className="py-3 px-3.5 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.formattedDate}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Wk {item.weekNumber}
                        </span>
                      </div>
                      {item.isSkipped && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800">
                          Skipped / still pending
                        </span>
                      )}
                    </td>

                    {/* EMI */}
                    <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-700">
                      {formatCurrency(item.emi)}
                    </td>

                    {/* Paid */}
                    <td className="py-3 px-3.5 text-right font-mono font-bold">
                      {item.paid > 0 ? (
                        <span className="text-emerald-700">+{formatCurrency(item.paid)}</span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>

                    {/* PENDING */}
                    <td className="py-3 px-3.5 text-right font-mono">
                      {item.pending > 0 ? (
                        <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          {formatCurrency(item.pending)}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5 text-center">{renderStatusChip(item)}</td>

                    {/* Collected On */}
                    <td className="py-3 px-3.5 font-mono text-slate-600">
                      {item.collectedOn}
                    </td>

                    {/* Mode */}
                    <td className="py-3 px-3.5 text-slate-600">
                      {item.paymentMode !== '—' ? (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          {item.paymentMode}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Collected By */}
                    <td className="py-3 px-3.5 text-slate-600">
                      {item.collectedBy !== '—' ? (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <User className="w-3 h-3 text-slate-400" />
                          {item.collectedBy}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Footer Totals Row */}
            <tfoot>
              <tr className="bg-slate-100/90 font-bold text-xs text-slate-900 border-t-2 border-slate-300">
                <td className="py-3.5 px-3.5">
                  <span>Total ({schedule.length} Weeks)</span>
                </td>
                <td className="py-3.5 px-3.5 text-right font-mono text-slate-900">
                  {formatCurrency(totals.totalEmi)}
                </td>
                <td className="py-3.5 px-3.5 text-right font-mono text-emerald-700">
                  +{formatCurrency(totals.totalPaid)}
                </td>
                <td className="py-3.5 px-3.5 text-right font-mono text-rose-600">
                  {formatCurrency(totals.totalPending)}
                </td>
                <td colSpan={4} className="py-3.5 px-3.5 text-right text-slate-500 font-normal">
                  Remaining balance to collect:{' '}
                  <strong className="text-rose-700 font-mono">
                    {formatCurrency(totals.totalPending)}
                  </strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MOBILE CARD VIEW (< 768px, no horizontal scroll) */}
      <div className="md:hidden space-y-2.5">
        {filteredSchedule.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
            No due records match filter "{filter}".
          </div>
        ) : (
          filteredSchedule.map((item) => (
            <div
              key={item.dueDate}
              className={`p-3.5 rounded-2xl border transition-all ${
                item.isSkipped
                  ? 'border-rose-300 bg-rose-50/40 border-l-4 border-l-rose-600 shadow-xs'
                  : item.status === 'Overdue'
                  ? 'border-rose-200 bg-rose-50/20'
                  : item.status === 'Paid'
                  ? 'border-emerald-100 bg-emerald-50/20'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">
                      {item.formattedDate}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (Wk {item.weekNumber})
                    </span>
                  </div>
                  {item.isSkipped && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800">
                      Skipped / still pending
                    </span>
                  )}
                </div>
                {renderStatusChip(item)}
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">EMI</span>
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(item.emi)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Paid</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {item.paid > 0 ? `+${formatCurrency(item.paid)}` : '₹0'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Pending</span>
                  <span className={`font-mono font-black ${item.pending > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                    {item.pending > 0 ? formatCurrency(item.pending) : '—'}
                  </span>
                </div>
              </div>

              {(item.collectedOn !== '—' || item.collectedBy !== '—') && (
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Collected on {item.collectedOn}</span>
                  <span>By {item.collectedBy}</span>
                </div>
              )}
            </div>
          ))
        )}

        {/* Mobile Total Card */}
        <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Pending</span>
            <span className="text-base font-extrabold font-mono text-rose-400">
              {formatCurrency(totals.totalPending)}
            </span>
          </div>
          <div className="text-right text-[11px] text-slate-300">
            <div>EMI: {formatCurrency(totals.totalEmi)}</div>
            <div className="text-emerald-400 font-bold">Paid: {formatCurrency(totals.totalPaid)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

