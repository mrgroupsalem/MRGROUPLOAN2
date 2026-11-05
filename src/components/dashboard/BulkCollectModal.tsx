'use client'

import React, { useState, useMemo } from 'react'
import {
  X,
  Wallet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Calendar,
} from 'lucide-react'
import { PendingCustomerItem, calculateTotalPayable } from '@/hooks/usePendingCollections'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PendingDueList from './PendingDueList'
import CustomerNameLink from '@/components/ui/CustomerNameLink'

interface BulkCollectModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCustomers: PendingCustomerItem[]
  onSuccess: (collectedCount: number, totalCollected: number, collectedIds: string[]) => void
}

export default function BulkCollectModal({
  isOpen,
  onClose,
  selectedCustomers,
  onSuccess,
}: BulkCollectModalProps) {
  // Track expanded state per loanId
  const [expandedLoanIds, setExpandedLoanIds] = useState<Set<string>>(() => new Set())

  // Track ticked due dates per loan: Record<loanId, Set<dueDateStr>>
  const [selectedDatesByLoan, setSelectedDatesByLoan] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {}
    selectedCustomers.forEach((c) => {
      const dates = new Set((c.breakdown || []).filter((b) => b.pending > 0).map((b) => b.dueDate))
      init[c.loanId] = dates
    })
    return init
  })

  // Track editable amount per dueDate: Record<`${loanId}_${dueDate}`, number>
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    selectedCustomers.forEach((c) => {
      (c.breakdown || []).forEach((b) => {
        init[`${c.loanId}_${b.dueDate}`] = b.pending
      })
    })
    return init
  })

  // Row error states: Record<loanId, string>
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Other'>('Cash')
  const [collectionDate, setCollectionDate] = useState<string>(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Toggle expand for a customer
  const toggleExpand = (loanId: string) => {
    setExpandedLoanIds((prev) => {
      const next = new Set(prev)
      if (next.has(loanId)) next.delete(loanId)
      else next.add(loanId)
      return next
    })
  }

  // Toggle individual due date for a customer
  const handleToggleDueDate = (loanId: string, dueDate: string) => {
    setSelectedDatesByLoan((prev) => {
      const current = new Set(prev[loanId] || [])
      if (current.has(dueDate)) {
        current.delete(dueDate)
      } else {
        current.add(dueDate)
      }
      return { ...prev, [loanId]: current }
    })
  }

  // Customer-level checkbox toggle: all dates or none
  const handleToggleCustomerAllDates = (c: PendingCustomerItem) => {
    const allPendingDates = (c.breakdown || []).filter((b) => b.pending > 0).map((b) => b.dueDate)
    const current = selectedDatesByLoan[c.loanId] || new Set()
    const isAllSelected = allPendingDates.length > 0 && current.size === allPendingDates.length

    setSelectedDatesByLoan((prev) => {
      return {
        ...prev,
        [c.loanId]: isAllSelected ? new Set() : new Set(allPendingDates),
      }
    })
  }

  // Amount change for a specific date
  const handleAmountChange = (loanId: string, dueDate: string, val: number) => {
    setCustomAmounts((prev) => ({
      ...prev,
      [`${loanId}_${dueDate}`]: val,
    }))
  }

  // Calculate totals per customer and grand total
  const customerSubtotals = useMemo(() => {
    const subtotals: Record<string, number> = {}
    selectedCustomers.forEach((c) => {
      const ticked = selectedDatesByLoan[c.loanId] || new Set()
      let sum = 0
      ;(c.breakdown || []).forEach((b) => {
        if (ticked.has(b.dueDate)) {
          const amt = customAmounts[`${c.loanId}_${b.dueDate}`] !== undefined ? customAmounts[`${c.loanId}_${b.dueDate}`] : b.pending
          sum += amt
        }
      })
      subtotals[c.loanId] = sum
    })
    return subtotals
  }, [selectedCustomers, selectedDatesByLoan, customAmounts])

  const grandTotal = useMemo(() => {
    return Object.values(customerSubtotals).reduce((sum, v) => sum + v, 0)
  }, [customerSubtotals])

  // Detect skipped older dates warning for any customer
  const skippedWarnings = useMemo(() => {
    const warnings: string[] = []
    selectedCustomers.forEach((c) => {
      const ticked = selectedDatesByLoan[c.loanId] || new Set()
      const pendingItems = (c.breakdown || []).filter((b) => b.pending > 0)

      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i]
        // If an older date is unticked...
        if (!ticked.has(item.dueDate)) {
          // Check if any newer date is ticked
          const hasNewerTicked = pendingItems.slice(i + 1).some((newer) => ticked.has(newer.dueDate))
          if (hasNewerTicked) {
            warnings.push(
              `${c.customerName}: Older due ${item.formattedDate} is still pending while newer dues are selected.`
            )
            break
          }
        }
      }
    })
    return warnings
  }, [selectedCustomers, selectedDatesByLoan])

  if (!isOpen || selectedCustomers.length === 0) return null

  // Confirm Collection Handler
  const handleConfirmBulkCollect = async () => {
    setIsProcessing(true)
    setGeneralError(null)
    setRowErrors({})

    const successfulLoanIds: string[] = []
    let totalCollectedAmount = 0
    const errors: Record<string, string> = {}

    try {
      for (const item of selectedCustomers) {
        const tickedDates = selectedDatesByLoan[item.loanId] || new Set()
        if (tickedDates.size === 0) continue

        const loan = item.loan
        let customerUUID = loan.customer?.id
        if (!customerUUID) {
          const { data: cData } = await supabase
            .from('customers')
            .select('id')
            .eq('customer_id_display', loan.customer_id)
            .maybeSingle()
          customerUUID = cData?.id || loan.customer_id
        }

        // Fetch existing collections to compute starting balance
        const { data: existingColls } = await supabase
          .from('collections')
          .select('amount_collected')
          .eq('loan_id', loan.id)

        const totalLoanAmount = calculateTotalPayable(loan)
        let collectedSoFar = (existingColls || []).reduce(
          (sum, c) => sum + (Number(c.amount_collected) || 0),
          0
        )

        let customerSuccess = true
        let customerPaidThisBatch = 0

        // Process each ticked due date
        const breakdownItems = (item.breakdown || []).filter((b) => tickedDates.has(b.dueDate))

        for (const b of breakdownItems) {
          const dateAmt = customAmounts[`${item.loanId}_${b.dueDate}`] !== undefined
            ? customAmounts[`${item.loanId}_${b.dueDate}`]
            : b.pending

          if (dateAmt <= 0) continue

          collectedSoFar += dateAmt
          customerPaidThisBatch += dateAmt
          const remainingBalance = Math.max(0, totalLoanAmount - collectedSoFar)

          // Insert collection record with due_date
          const { error: insErr } = await supabase.from('collections').insert({
            loan_id: loan.id,
            customer_id: customerUUID,
            amount_collected: dateAmt,
            due_date: b.dueDate, // Option A: explicit due_date
            collection_date: collectionDate || new Date().toISOString().split('T')[0],
            status: 'completed',
            worker_id: loan.team_leader_id,
            remaining_balance: remainingBalance,
            notes: `[DUE:${b.dueDate}] Bulk collection - ${item.customerName} (${paymentMode})`,
          })

          if (insErr) {
            customerSuccess = false
            errors[item.loanId] = insErr.message
            break
          }
        }

        if (customerSuccess) {
          successfulLoanIds.push(item.loanId)
          totalCollectedAmount += customerPaidThisBatch

          const finalBalance = Math.max(0, totalLoanAmount - collectedSoFar)
          if (finalBalance <= 0) {
            await supabase.from('loans').update({ status: 'closed' }).eq('id', loan.id)
          }

          // If all dues for this loan are now paid, remove from pending_customers table
          const remainingDuesCount = (item.breakdown || []).filter(
            (b) => !tickedDates.has(b.dueDate) && b.pending > 0
          ).length

          if (remainingDuesCount === 0) {
            await supabase.from('pending_customers').delete().eq('loan_id', loan.id)
          }
        }
      }

      // Broadcast update across active tabs
      try {
        const bc = new BroadcastChannel('collections')
        bc.postMessage({
          type: 'bulk-collection-updated',
          count: successfulLoanIds.length,
          totalAmount: totalCollectedAmount,
          timestamp: new Date().toISOString(),
        })
        bc.close()
      } catch (e) {
        // BroadcastChannel fallback
      }

      if (Object.keys(errors).length > 0) {
        setRowErrors(errors)
        setGeneralError(`${successfulLoanIds.length} collected successfully, ${Object.keys(errors).length} failed.`)
      } else {
        onSuccess(successfulLoanIds.length, totalCollectedAmount, successfulLoanIds)
        onClose()
      }
    } catch (err: any) {
      console.error('Failed to execute bulk collection:', err)
      setGeneralError(err.message || 'Bulk collection failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Bulk Collect Selected</h3>
              <p className="text-xs text-emerald-100">
                {selectedCustomers.length} borrowers · Total due selected:{' '}
                <strong className="text-white">{formatCurrency(grandTotal)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Controls: Mode & Collection Date */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs flex-shrink-0">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Payment Method
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / GPay / PhonePe</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Collection Date
            </label>
            <input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Skipped older date warning banner */}
        {skippedWarnings.length > 0 && (
          <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2 animate-in slide-in-from-top-2 duration-200 flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Skipped Older Due Date Warning</span>
              {skippedWarnings.map((w, idx) => (
                <p key={idx} className="text-[11px] text-amber-700 leading-tight">
                  {w}
                </p>
              ))}
            </div>
          </div>
        )}

        {generalError && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2 flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        {/* Selected Customers List with Expandable Date-wise Dues */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Borrowers & Scheduled Dues ({selectedCustomers.length})
          </p>

          <div className="space-y-2.5">
            {selectedCustomers.map((c) => {
              const isExpanded = expandedLoanIds.has(c.loanId)
              const tickedDates = selectedDatesByLoan[c.loanId] || new Set()
              const pendingItems = (c.breakdown || []).filter((b) => b.pending > 0)
              const isAllTicked = pendingItems.length > 0 && tickedDates.size === pendingItems.length
              const isIndeterminate = tickedDates.size > 0 && !isAllTicked
              const subtotal = customerSubtotals[c.loanId] || 0
              const rowError = rowErrors[c.loanId]

              // Helper for amounts mapping
              const amountsMap: Record<string, number> = {}
              ;(c.breakdown || []).forEach((b) => {
                amountsMap[b.dueDate] = customAmounts[`${c.loanId}_${b.dueDate}`] !== undefined
                  ? customAmounts[`${c.loanId}_${b.dueDate}`]
                  : b.pending
              })

              return (
                <div
                  key={c.loanId}
                  className={`border rounded-2xl transition-all overflow-hidden bg-white shadow-xs ${
                    rowError
                      ? 'border-red-300 ring-2 ring-red-100'
                      : isAllTicked || isIndeterminate
                      ? 'border-slate-300'
                      : 'border-slate-200 opacity-70'
                  }`}
                >
                  {/* Customer Row Header */}
                  <div className="p-3.5 flex items-center justify-between gap-3 bg-slate-50/70 select-none">
                    <div className="flex items-center gap-3">
                      {/* Customer-level checkbox */}
                      <input
                        type="checkbox"
                        checked={isAllTicked}
                        ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate
                        }}
                        onChange={() => handleToggleCustomerAllDates(c)}
                        className="w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                        title="Select/Deselect all dues for this borrower"
                      />

                      <div>
                        <div className="flex items-center gap-2">
                          <CustomerNameLink
                            customerId={c.loan.customer_id || c.customerIdDisplay}
                            loan={c.loan}
                            name={c.customerName}
                          />
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 capitalize">
                            {c.batchDay} batch
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Leader: {c.teamLeaderName} · {tickedDates.size} of {pendingItems.length} dues ticked
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Subtotal</span>
                        <strong className="text-sm font-black text-emerald-700">
                          {formatCurrency(subtotal)}
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleExpand(c.loanId)}
                        className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
                        title={isExpanded ? 'Collapse schedule' : 'Expand date-wise schedule'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {rowError && (
                    <div className="px-3.5 py-1.5 bg-red-50 text-[11px] text-red-600 font-semibold border-t border-red-100">
                      Failed: {rowError}
                    </div>
                  )}

                  {/* Expandable Date-wise Dues List */}
                  {isExpanded && (
                    <div className="p-3.5 border-t border-slate-100 bg-white">
                      <PendingDueList
                        items={c.breakdown || []}
                        selectable
                        selectedDates={tickedDates}
                        onToggleDate={(dateStr) => handleToggleDueDate(c.loanId, dateStr)}
                        amounts={amountsMap}
                        onAmountChange={(dateStr, val) => handleAmountChange(c.loanId, dateStr, val)}
                        showFooter={false}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Grand Total to Collect</span>
            <span className="text-xl font-black text-emerald-700">{formatCurrency(grandTotal)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-bold text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmBulkCollect}
              disabled={isProcessing || grandTotal <= 0}
              className="px-5 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Collecting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Bulk Collect ({selectedCustomers.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
