'use client'

import { useState } from 'react'
import { X, Wallet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { PendingCustomerItem, calculateTotalPayable } from '@/hooks/usePendingCollections'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

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
  // Map of loanId -> custom amount entered by admin
  const [amounts, setAmounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    selectedCustomers.forEach((c) => {
      init[c.loanId] = c.totalPendingAmount
    })
    return init
  })

  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Other'>('Cash')
  const [collectionDate, setCollectionDate] = useState<string>(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen || selectedCustomers.length === 0) return null

  const totalAmount = selectedCustomers.reduce((sum, c) => sum + (amounts[c.loanId] || 0), 0)

  const handleAmountChange = (loanId: string, val: string) => {
    const num = Math.max(0, Number(val) || 0)
    setAmounts((prev) => ({ ...prev, [loanId]: num }))
  }

  const handleConfirmBulkCollect = async () => {
    setIsProcessing(true)
    setErrorMsg(null)

    const successfulLoanIds: string[] = []
    let totalCollectedAmount = 0
    const errors: string[] = []

    try {
      for (const item of selectedCustomers) {
        const amt = amounts[item.loanId] || item.totalPendingAmount
        if (amt <= 0) continue

        const loan = item.loan

        // Get customer UUID
        let customerUUID = loan.customer?.id
        if (!customerUUID) {
          const { data: cData } = await supabase
            .from('customers')
            .select('id')
            .eq('customer_id_display', loan.customer_id)
            .maybeSingle()
          customerUUID = cData?.id || loan.customer_id
        }

        // Fetch existing collections to compute remaining balance
        const { data: existingColls } = await supabase
          .from('collections')
          .select('amount_collected')
          .eq('loan_id', loan.id)

        const totalLoanAmount = calculateTotalPayable(loan)
        const collectedSoFar = (existingColls || []).reduce(
          (sum, c) => sum + (Number(c.amount_collected) || 0),
          0
        )
        const remainingBalance = Math.max(0, totalLoanAmount - collectedSoFar - amt)

        // Insert collection
        const { error: insErr } = await supabase.from('collections').insert({
          loan_id: loan.id,
          customer_id: customerUUID,
          amount_collected: amt,
          collection_date: collectionDate || new Date().toISOString().split('T')[0],
          status: 'completed',
          worker_id: loan.team_leader_id,
          remaining_balance: remainingBalance,
          notes: `Bulk collection - ${item.customerName} (${paymentMode})`,
        })

        if (insErr) {
          errors.push(`${item.customerName}: ${insErr.message}`)
          continue
        }

        // Check if loan should be closed
        if (remainingBalance <= 0) {
          await supabase.from('loans').update({ status: 'closed' }).eq('id', loan.id)
        }

        // Remove from pending_customers table
        await supabase.from('pending_customers').delete().eq('loan_id', loan.id)

        successfulLoanIds.push(item.loanId)
        totalCollectedAmount += amt
      }

      // Broadcast update
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
        console.warn('Broadcast error:', e)
      }

      if (errors.length > 0) {
        setErrorMsg(`Collected ${successfulLoanIds.length} items. Errors: ${errors.join(', ')}`)
      }

      onSuccess(successfulLoanIds.length, totalCollectedAmount, successfulLoanIds)
      onClose()
    } catch (err: any) {
      console.error('Bulk collect error:', err)
      setErrorMsg(err.message || 'Failed to complete bulk collection.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Bulk Collect Selected</h3>
              <p className="text-xs text-emerald-100">
                {selectedCustomers.length} borrowers selected · Total due:{' '}
                <strong>{formatCurrency(totalAmount)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Selected List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Review & Adjust Amounts Per Borrower
          </p>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
            {selectedCustomers.map((c) => (
              <div
                key={c.loanId}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">{c.customerName}</p>
                    <span className="text-[10px] font-mono text-slate-400 capitalize">
                      {c.batchDay} batch
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Leader: {c.teamLeaderName} · Standard EMI: {formatCurrency(c.weeklyEmi)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    step="any"
                    value={amounts[c.loanId] !== undefined ? amounts[c.loanId] : c.totalPendingAmount}
                    onChange={(e) => handleAmountChange(c.loanId, e.target.value)}
                    className="w-28 px-2.5 py-1 text-xs font-bold text-right border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-400 block">Total to Collect</span>
            <span className="text-lg font-black text-emerald-700">{formatCurrency(totalAmount)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-bold text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmBulkCollect}
              disabled={isProcessing || totalAmount <= 0}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
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

