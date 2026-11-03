'use client'

import React, { useState, useEffect } from 'react'
import { Employee, Loan, LeaderCommissionPayment } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useRole } from '@/components/RoleProvider'
import {
  Banknote,
  Coins,
  CreditCard,
  Calendar,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  Trash2,
  X,
  FileText,
  Clock,
  ShieldAlert,
  ArrowRight
} from 'lucide-react'

interface LeaderCommissionSectionProps {
  worker: Employee
  loans: Loan[]
}

export default function LeaderCommissionSection({ worker, loans }: LeaderCommissionSectionProps) {
  const { user, isAdmin } = useRole()

  const leaderCode = worker.leader_id || worker.name.match(/\b(\d{3})\b/)?.[1] || worker.id
  const [commissionRate, setCommissionRate] = useState<number>(500)
  const [isEditingRate, setIsEditingRate] = useState<boolean>(false)
  const [tempRate, setTempRate] = useState<string>('500')

  // Payments & State
  const [payments, setPayments] = useState<LeaderCommissionPayment[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [showPaymentForm, setShowPaymentForm] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash')
  const [referenceNumber, setReferenceNumber] = useState<string>('')
  const [paymentNotes, setPaymentNotes] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [tablePendingNotice, setTablePendingNotice] = useState<string | null>(null)

  // Load existing payments for this leader
  useEffect(() => {
    loadPayments()
  }, [worker.id, leaderCode])

  const loadPayments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/workers/commission-payment?leaderId=${encodeURIComponent(leaderCode)}&employeeId=${encodeURIComponent(worker.id)}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.payments)) {
        setPayments(data.payments)
        setTablePendingNotice(null)
      } else if (data.tablePending || data.error?.includes('leader_commission_payments')) {
        setTablePendingNotice(data.error || "Database table 'leader_commission_payments' not created yet in Supabase.")
      }
    } catch (err: any) {
      console.error('Failed to load leader commission payments from Supabase:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate eligible loans:
  // Count each distinct loan in loans table where team_leader_id matches worker.id or leaderCode
  const eligibleLoans = loans.filter(l => 
    (l.team_leader_id === worker.id || l.team_leader_id === leaderCode || (worker.leader_id && l.team_leader_id === worker.leader_id)) &&
    (l.status === 'active' || l.status === 'closed')
  )

  const eligibleLoansCount = eligibleLoans.length
  const totalEarnedCommission = eligibleLoansCount * commissionRate
  const totalAmountPaid = payments.reduce((sum, p) => sum + Number((p as any).amount || p.amount_paid || 0), 0)
  const remainingBalance = Math.max(0, totalEarnedCommission - totalAmountPaid)

  // Quick fill helper
  const handleQuickFill = (amount: number) => {
    const safeAmount = Math.min(amount, remainingBalance)
    setPaymentAmount(String(safeAmount))
    setFormError(null)
  }

  // Handle Save Payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    const amount = Number(paymentAmount)
    if (!amount || isNaN(amount) || amount <= 0) {
      setFormError('Payment amount must be greater than ₹0.')
      return
    }

    if (!paymentDate) {
      setFormError('Please select a payment date.')
      return
    }

    if (amount > remainingBalance) {
      setFormError(`Payment amount (₹${amount.toLocaleString()}) cannot exceed the remaining balance of ₹${remainingBalance.toLocaleString()}.`)
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        leaderId: leaderCode,
        employeeId: worker.id,
        leaderName: worker.name,
        amountPaid: amount,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
        recordedBy: user?.name || 'Admin',
        commissionRate: commissionRate
      }

      const res = await fetch('/api/workers/commission-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        setFormError(result.error || 'Failed to record payment.')
        return
      }

      // Refresh payment history strictly from Supabase
      await loadPayments()
      setSuccessMessage(`Payment of ${formatCurrency(amount)} recorded and saved permanently in Supabase!`)
      
      // Reset form
      setPaymentAmount('')
      setReferenceNumber('')
      setPaymentNotes('')
      setShowPaymentForm(false)

      setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)
    } catch (err: any) {
      setFormError(err.message || 'Network error while recording payment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete / Void Payment (Admin only)
  const handleDeletePayment = async (paymentId: string, amount: number) => {
    if (!confirm(`Are you sure you want to void this payment record of ${formatCurrency(amount)}? This action cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/workers/commission-payment?id=${encodeURIComponent(paymentId)}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        setPayments(prev => prev.filter(p => p.id !== paymentId))
        setSuccessMessage('Payment voided successfully.')
        setTimeout(() => setSuccessMessage(null), 4000)
      } else {
        alert(data.error || 'Failed to delete payment.')
      }
    } catch (err) {
      alert('Error deleting payment.')
    }
  }

  const handleUpdateRate = () => {
    const newRate = parseFloat(tempRate)
    if (!isNaN(newRate) && newRate >= 0) {
      setCommissionRate(newRate)
      setIsEditingRate(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-6 shadow-xs">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Loan Creation Commission & Payment Tracking
            </h3>
            <p className="text-xs text-gray-500">
              Exclusive to Workers Page • ₹{commissionRate} per eligible new or renewed loan
            </p>
          </div>
        </div>

        {/* Admin Rate Modifier */}
        {isAdmin() && (
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            {isEditingRate ? (
              <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-lg border">
                <span className="text-gray-500 font-semibold">Rate: ₹</span>
                <input
                  type="number"
                  value={tempRate}
                  onChange={(e) => setTempRate(e.target.value)}
                  className="w-20 px-2 py-1 text-xs border rounded outline-none font-bold text-gray-900"
                  min="0"
                />
                <button
                  type="button"
                  onClick={handleUpdateRate}
                  className="px-2 py-1 bg-blue-600 text-white rounded font-semibold text-[11px]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingRate(false)}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded font-semibold text-[11px]"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTempRate(String(commissionRate))
                  setIsEditingRate(true)
                }}
                className="text-[11px] text-gray-500 hover:text-blue-600 underline font-medium"
              >
                Change Rate (Current: ₹{commissionRate})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Database Schema Notice */}
      {tablePendingNotice && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Supabase Database Migration Required</span>
          </div>
          <p className="text-amber-800">
            {tablePendingNotice}
          </p>
          <p className="text-[11px] text-amber-700">
            Open the <strong>Supabase Dashboard → SQL Editor</strong> and execute <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">migrations/add_leader_commission_payments.sql</code>.
          </p>
        </div>
      )}

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5-Card Commission Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Eligible Loans */}
        <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
            Eligible New Loans
          </span>
          <p className="text-2xl font-extrabold text-blue-950 mt-1">{eligibleLoansCount}</p>
          <span className="text-[10px] text-blue-600 block mt-0.5">First-time & Renewals</span>
        </div>

        {/* Commission Rate */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Rate Per Loan
          </span>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{formatCurrency(commissionRate)}</p>
          <span className="text-[10px] text-gray-500 block mt-0.5">Standard Leader Rate</span>
        </div>

        {/* Total Earned Commission */}
        <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block">
            Total Earned
          </span>
          <p className="text-2xl font-extrabold text-purple-950 mt-1">
            {formatCurrency(totalEarnedCommission)}
          </p>
          <span className="text-[10px] text-purple-600 block mt-0.5">{eligibleLoansCount} loans × ₹{commissionRate}</span>
        </div>

        {/* Total Paid by Admin */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Total Paid
          </span>
          <p className="text-2xl font-extrabold text-emerald-950 mt-1">
            {formatCurrency(totalAmountPaid)}
          </p>
          <span className="text-[10px] text-emerald-600 block mt-0.5">{payments.length} payment transaction(s)</span>
        </div>

        {/* Remaining Balance */}
        <div className={`rounded-xl p-3.5 border ${
          remainingBalance > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-gray-50 border-gray-200'
        }`}>
          <span className={`text-[11px] font-semibold uppercase tracking-wider block ${
            remainingBalance > 0 ? 'text-amber-800' : 'text-gray-500'
          }`}>
            Remaining Balance
          </span>
          <p className={`text-2xl font-extrabold mt-1 ${
            remainingBalance > 0 ? 'text-amber-950' : 'text-gray-700'
          }`}>
            {formatCurrency(remainingBalance)}
          </p>
          <span className={`text-[10px] block mt-0.5 ${
            remainingBalance > 0 ? 'text-amber-700 font-medium' : 'text-gray-400'
          }`}>
            {remainingBalance > 0 ? 'Pending payout' : 'All cleared ✓'}
          </span>
        </div>
      </div>

      {/* Admin Payment Entry Section */}
      {isAdmin() && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Admin Payment Entry</span>
            </h4>

            {!showPaymentForm && (
              <button
                type="button"
                onClick={() => {
                  setShowPaymentForm(true)
                  setFormError(null)
                  setPaymentAmount(remainingBalance > 0 ? String(remainingBalance) : '')
                }}
                disabled={remainingBalance <= 0}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Record Payment</span>
              </button>
            )}
          </div>

          {/* Form Modal / Inline Box */}
          {showPaymentForm && (
            <form onSubmit={handleSavePayment} className="p-4 bg-gray-50 border border-gray-300 rounded-xl space-y-4 shadow-inner">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-gray-900">
                  Record Commission Payment to {worker.name}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* Payment Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-gray-700">Payment Amount (₹) *</label>
                    {remainingBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => handleQuickFill(remainingBalance)}
                        className="text-[10px] text-blue-600 hover:underline font-bold"
                      >
                        Full (₹{remainingBalance.toLocaleString()})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(e.target.value)
                      setFormError(null)
                    }}
                    placeholder={`Max ₹${remainingBalance.toLocaleString()}`}
                    max={remainingBalance}
                    min="1"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-900"
                    required
                  />
                  {/* Quick-fill chips */}
                  <div className="flex gap-1.5 mt-1.5">
                    {remainingBalance >= 500 && (
                      <button
                        type="button"
                        onClick={() => handleQuickFill(500)}
                        className="px-2 py-0.5 bg-white border border-gray-300 hover:bg-gray-100 rounded text-[10px] font-semibold text-gray-700"
                      >
                        ₹500
                      </button>
                    )}
                    {remainingBalance >= 1000 && (
                      <button
                        type="button"
                        onClick={() => handleQuickFill(1000)}
                        className="px-2 py-0.5 bg-white border border-gray-300 hover:bg-gray-100 rounded text-[10px] font-semibold text-gray-700"
                      >
                        ₹1,000
                      </button>
                    )}
                    {remainingBalance >= 2500 && (
                      <button
                        type="button"
                        onClick={() => handleQuickFill(2500)}
                        className="px-2 py-0.5 bg-white border border-gray-300 hover:bg-gray-100 rounded text-[10px] font-semibold text-gray-700"
                      >
                        ₹2,500
                      </button>
                    )}
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-gray-900"
                    required
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">Actual date paid to leader</span>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-gray-900"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="UPI / GPay">UPI / GPay / PhonePe</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Reference / UTR (Optional)</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. UTR12893821"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="text-xs">
                <label className="font-semibold text-gray-700 block mb-1">Notes / Remarks (Optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Weekly loan creation commission payout"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-gray-900"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-gray-600">
                  {paymentAmount && !isNaN(Number(paymentAmount)) && Number(paymentAmount) > 0 && (
                    <span>
                      Balance after payment:{' '}
                      <strong className="text-gray-900">
                        {formatCurrency(Math.max(0, remainingBalance - Number(paymentAmount)))}
                      </strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    disabled={isSubmitting}
                    className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Saving Payment...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save Payment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Date-Wise Admin Payment History Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Date-Wise Payment History ({payments.length})
            </h4>
          </div>
          <span className="text-[11px] text-gray-500">Ordered with latest payment date first</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Loading payment records...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs">
            No commission payments recorded yet for this leader.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Payment Date</th>
                  <th className="px-4 py-2.5">Amount Paid</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5">Reference / Notes</th>
                  <th className="px-4 py-2.5">Recorded By</th>
                  {isAdmin() && <th className="px-4 py-2.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Payment Date */}
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatDate(payment.payment_date)}</span>
                      </div>
                    </td>

                    {/* Amount Paid */}
                    <td className="px-4 py-3 font-bold text-emerald-700 whitespace-nowrap text-sm">
                      {formatCurrency(payment.amount_paid)}
                    </td>

                    {/* Method */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-800">
                        {payment.payment_method || 'Cash'}
                      </span>
                    </td>

                    {/* Reference / Notes */}
                    <td className="px-4 py-3 text-gray-600">
                      {payment.reference_number && (
                        <div className="font-mono text-[11px] text-gray-800 font-semibold">
                          Ref: {payment.reference_number}
                        </div>
                      )}
                      {payment.notes && (
                        <div className="text-[11px] text-gray-500 truncate max-w-xs">
                          {payment.notes}
                        </div>
                      )}
                      {!payment.reference_number && !payment.notes && (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Recorded By */}
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      <div className="text-[11px]">
                        <span className="font-medium text-gray-800">{payment.recorded_by || 'Admin'}</span>
                        {payment.created_at && (
                          <div className="text-[10px] text-gray-400">
                            {new Date(payment.created_at).toLocaleDateString('en-GB')}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions (Delete/Void for Admin) */}
                    {isAdmin() && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(payment.id, payment.amount_paid)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Void / Delete Payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {/* Summary Footer */}
              <tfoot className="bg-gray-50 font-bold border-t border-gray-200 text-gray-900">
                <tr>
                  <td className="px-4 py-2.5">Total Paid</td>
                  <td className="px-4 py-2.5 text-emerald-800 text-sm">
                    {formatCurrency(totalAmountPaid)}
                  </td>
                  <td colSpan={isAdmin() ? 4 : 3} className="px-4 py-2.5 text-right text-gray-600 font-medium">
                    Remaining Balance:{' '}
                    <span className="text-amber-800 font-bold ml-1">
                      {formatCurrency(remainingBalance)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

