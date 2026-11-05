'use client'

import { useState } from 'react'
import { X, CheckCircle, AlertCircle, RefreshCw, Wallet, Calendar, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PendingCustomerItem, calculateTotalPayable } from '@/hooks/usePendingCollections'
import { formatCurrency } from '@/lib/utils'

interface QuickCollectModalProps {
  customer: PendingCustomerItem
  isOpen: boolean
  onClose: () => void
  onSuccess: (amountCollected: number) => void
}

export default function QuickCollectModal({
  customer,
  isOpen,
  onClose,
  onSuccess,
}: QuickCollectModalProps) {
  const [amount, setAmount] = useState<string>(String(customer.weeklyEmi))
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Other'>('Cash')
  const [collectionDate, setCollectionDate] = useState<string>(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  )
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid payment amount')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const loan = customer.loan

      // 1. Fetch current collections for this loan to determine remaining balance
      const { data: existingColls } = await supabase
        .from('collections')
        .select('amount_collected')
        .eq('loan_id', loan.id)

      const totalLoanAmount = calculateTotalPayable(loan)
      const collectedSoFar = (existingColls || []).reduce(
        (sum, c) => sum + (Number(c.amount_collected) || 0),
        0
      )
      const remainingBalance = Math.max(0, totalLoanAmount - collectedSoFar - numericAmount)

      // 2. Ensure customer UUID
      let customerUUID = loan.customer?.id
      if (!customerUUID) {
        const { data: cData } = await supabase
          .from('customers')
          .select('id')
          .eq('customer_id_display', loan.customer_id)
          .maybeSingle()
        customerUUID = cData?.id || loan.customer_id
      }

      // 3. Insert record into `collections` table
      const targetDueDate = customer.breakdown?.find((b) => b.pending > 0)?.dueDate || null
      const { error: insertError } = await supabase.from('collections').insert({
        loan_id: loan.id,
        customer_id: customerUUID,
        amount_collected: numericAmount,
        collection_date: collectionDate || new Date().toISOString().split('T')[0],
        due_date: targetDueDate,
        status: 'completed',
        worker_id: loan.team_leader_id,
        remaining_balance: remainingBalance,
        notes: notes || `Quick collect from Dashboard - ${customer.customerName} (${paymentMode})`,
      })

      if (insertError) throw insertError

      // 4. If loan is fully paid off, close it
      if (remainingBalance <= 0) {
        await supabase.from('loans').update({ status: 'closed' }).eq('id', loan.id)
      }

      // 5. Remove or decrement from pending_customers table
      if (customer.missedWeeksCount > 1 && numericAmount < customer.totalPendingAmount) {
        await supabase
          .from('pending_customers')
          .update({ pending_count: customer.missedWeeksCount - 1 })
          .eq('loan_id', loan.id)
      } else {
        await supabase.from('pending_customers').delete().eq('loan_id', loan.id)
      }

      // 6. Broadcast event to Collections page & other tabs
      try {
        const bc = new BroadcastChannel('collections')
        bc.postMessage({
          type: 'individual-collection-updated',
          loanId: loan.id,
          customerName: customer.customerName,
          amount: numericAmount,
          timestamp: new Date().toISOString(),
        })
        bc.close()
      } catch (bcErr) {
        console.warn('BroadcastChannel error:', bcErr)
      }

      onSuccess(numericAmount)
      onClose()
    } catch (err: any) {
      console.error('Error recording collection:', err)
      setError(err.message || 'Failed to record collection. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Collect Payment</h3>
              <p className="text-xs text-emerald-100">Quick EMI Collection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Details Pill */}
        <div className="px-6 pt-5">
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm">
                {customer.customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{customer.customerName}</p>
                <p className="text-xs text-slate-500 font-mono">
                  {customer.customerPhone || customer.customerIdDisplay}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                EMI: {formatCurrency(customer.weeklyEmi)}
              </span>
              <p className="text-[11px] text-slate-400 mt-1 capitalize">{customer.batchDay} Batch</p>
            </div>
          </div>
        </div>

        {/* Collection Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Collection Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                ₹
              </span>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
              <span>Standard EMI: {formatCurrency(customer.weeklyEmi)}</span>
              {customer.missedWeeksCount > 1 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(customer.totalPendingAmount))}
                  className="text-emerald-600 hover:text-emerald-700 font-medium underline"
                >
                  Full Due ({formatCurrency(customer.totalPendingAmount)})
                </button>
              )}
            </div>
          </div>

          {/* Payment Mode & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium text-slate-800 bg-white"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid in full via phone"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-800"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm Collection</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

