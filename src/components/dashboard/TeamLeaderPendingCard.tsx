'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Phone,
  Wallet,
  Clock,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import { TeamLeaderPendingGroup, PendingCustomerItem } from '@/hooks/usePendingCollections'
import { formatCurrency } from '@/lib/utils'
import CustomerNameLink from '@/components/ui/CustomerNameLink'
import DueBreakdownPopover from './DueBreakdownPopover'

interface TeamLeaderPendingCardProps {
  group: TeamLeaderPendingGroup
  selectedIds: Set<string>
  onToggleSelectRow: (loanId: string) => void
  onToggleSelectGroup: (group: TeamLeaderPendingGroup) => void
  onCollect: (customer: PendingCustomerItem) => void
  onViewProfile: (customer: PendingCustomerItem) => void
  defaultExpanded?: boolean
}

export default function TeamLeaderPendingCard({
  group,
  selectedIds,
  onToggleSelectRow,
  onToggleSelectGroup,
  onCollect,
  onViewProfile,
  defaultExpanded = false,
}: TeamLeaderPendingCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Group selection state: all, none, or indeterminate
  const groupCustomerIds = group.customers.map((c) => c.loanId)
  const selectedCountInGroup = groupCustomerIds.filter((id) => selectedIds.has(id)).length
  const isAllGroupSelected = groupCustomerIds.length > 0 && selectedCountInGroup === groupCustomerIds.length
  const isIndeterminate = selectedCountInGroup > 0 && !isAllGroupSelected

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_25px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden">
      {/* Team Leader Header / Accordion Trigger */}
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none bg-gradient-to-r from-slate-50/60 to-white hover:bg-slate-50 transition-colors">
        {/* Left: Checkbox & Leader Info */}
        <div className="flex items-center gap-3.5">
          {/* Select all for this group */}
          <div className="flex items-center pt-0.5">
            <input
              type="checkbox"
              checked={isAllGroupSelected}
              ref={(el) => {
                if (el) el.indeterminate = isIndeterminate
              }}
              onChange={() => onToggleSelectGroup(group)}
              className="w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer transition-transform active:scale-90"
              title="Select all customers for this team leader"
            />
          </div>

          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3.5 cursor-pointer flex-1"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-primary-500/20 flex-shrink-0">
              {group.teamLeaderName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">{group.teamLeaderName}</h4>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Team Leader
                </span>
                {selectedCountInGroup > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 animate-pop">
                    {selectedCountInGroup} selected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                <span className="font-semibold text-rose-600">{group.pendingCount}</span> pending
                customers ·{' '}
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(group.collectedAmount)}
                </span>{' '}
                collected
              </p>
            </div>
          </div>
        </div>

        {/* Right: Metrics & Accordion Toggle */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between md:justify-end gap-6 cursor-pointer"
        >
          <div className="text-right">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Total Pending Due
            </p>
            <p className="text-base font-extrabold text-rose-600">
              {formatCurrency(group.totalPendingAmount)}
            </p>
          </div>

          {/* Mini progress bar */}
          <div className="hidden sm:flex flex-col items-end w-28">
            <div className="flex items-center justify-between w-full text-[10px] text-slate-500 mb-1">
              <span>Collection</span>
              <span className="font-bold text-slate-700">{group.collectionRate}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, group.collectionRate)}%` }}
              />
            </div>
          </div>

          <div className="p-2 rounded-xl bg-slate-100/80 text-slate-600 hover:bg-slate-200 transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Customers Table / Mobile Cards */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/40 p-4 md:p-6 animate-fade-in">
          {group.customers.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>All collections cleared for this team leader!</span>
            </div>
          ) : (
            <>
              {/* Desktop View Table (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="pb-3 pl-2 w-8">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="pb-3 px-2">Borrower Details</th>
                      <th className="pb-3 px-3">Batch Day</th>
                      <th className="pb-3 px-3">Weekly EMI</th>
                      <th className="pb-3 px-3">Due Breakdown & Overdue</th>
                      <th className="pb-3 px-3">Total Due</th>
                      <th className="pb-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.customers.map((c) => {
                      const isSelected = selectedIds.has(c.loanId)
                      return (
                        <tr
                          key={c.loanId}
                          className={`transition-colors group/row ${
                            isSelected
                              ? 'bg-primary-50/70 border-l-4 border-l-primary-600'
                              : 'hover:bg-white/80'
                          }`}
                        >
                          <td className="py-3 pl-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleSelectRow(c.loanId)}
                              className="w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer transition-transform active:scale-95"
                            />
                          </td>

                          <td className="py-3 px-2">
                            <CustomerNameLink
                              customerId={c.loan.customer_id || c.customerIdDisplay}
                              loan={c.loan}
                              name={c.customerName}
                            />
                            <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                              {c.customerPhone ? (
                                <a
                                  href={`tel:${c.customerPhone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:underline"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{c.customerPhone}</span>
                                </a>
                              ) : (
                                <span>ID: {c.customerIdDisplay}</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 capitalize text-slate-600 font-medium">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border text-[11px]">
                              {c.batchDay}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {formatCurrency(c.weeklyEmi)}
                          </td>

                          <td className="py-3 px-3">
                            <DueBreakdownPopover items={c.breakdown || []} customerName={c.customerName}>
                              {c.missedWeeksCount > 1 ? (
                                <div className="space-y-1 group-hover/breakdown:opacity-90">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                    <AlertCircle className="w-3 h-3" />
                                    Overdue {c.missedWeeksCount - 1} week{c.missedWeeksCount > 2 ? 's' : ''} ({c.daysOverdue}d)
                                  </span>
                                  <p className="text-[11px] text-slate-500 leading-tight">
                                    Current: {formatCurrency(c.currentCycleEmi)} + Previous:{' '}
                                    {formatCurrency(c.previousPendingAmount)}
                                  </p>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 group-hover/breakdown:opacity-90">
                                  <Clock className="w-3 h-3" />
                                  Due this week
                                </span>
                              )}
                            </DueBreakdownPopover>
                          </td>

                          <td className="py-3 px-3 font-bold text-rose-600">
                            {formatCurrency(c.totalPendingAmount)}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onViewProfile(c)}
                                className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-300 transition-colors"
                                title="View Customer Profile"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onCollect(c)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
                              >
                                <Wallet className="w-3.5 h-3.5" />
                                <span>Collect</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Cards (< 768px) */}
              <div className="md:hidden space-y-3">
                {group.customers.map((c) => {
                  const isSelected = selectedIds.has(c.loanId)
                  return (
                    <div
                      key={c.loanId}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-primary-50/70 border-primary-400 shadow-sm'
                          : 'bg-white border-slate-200/80 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelectRow(c.loanId)}
                          className="w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-900">{c.customerName}</p>
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-700 capitalize">
                              {c.batchDay}
                            </span>
                          </div>

                          {c.customerPhone && (
                            <a
                              href={`tel:${c.customerPhone}`}
                              className="inline-flex items-center gap-1 text-[11px] text-primary-600 mt-0.5"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{c.customerPhone}</span>
                            </a>
                          )}

                          {c.missedWeeksCount > 1 ? (
                            <div className="mt-1.5 text-[11px] text-rose-600">
                              <span className="font-bold">Overdue {c.missedWeeksCount - 1}w:</span> Current{' '}
                              {formatCurrency(c.currentCycleEmi)} + Prev {formatCurrency(c.previousPendingAmount)}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 mt-1">EMI: {formatCurrency(c.weeklyEmi)}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-3 mt-3 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Total Due</span>
                          <span className="font-bold text-rose-600 text-sm">
                            {formatCurrency(c.totalPendingAmount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onViewProfile(c)}
                            className="p-2 rounded-xl border border-slate-200 text-slate-600"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onCollect(c)}
                            className="py-1.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>Collect</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
