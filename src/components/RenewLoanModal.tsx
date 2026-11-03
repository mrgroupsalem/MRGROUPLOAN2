'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loan, Customer, Employee } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getLoanDisplayId } from '@/lib/loanIdGenerator'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Eye,
  EyeOff,
  X,
  RefreshCw,
  HelpCircle,
  FileText
} from 'lucide-react'

export interface RenewLoanModalProps {
  closedLoan: any
  employees: Employee[]
  onClose: () => void
  onSuccess: (newLoan: Loan) => void
  onAbort?: () => void
}

export default function RenewLoanModal({
  closedLoan,
  employees,
  onClose,
  onSuccess,
  onAbort
}: RenewLoanModalProps) {
  // Navigation steps: 'edit' -> 'confirm' -> 'success'
  const [currentStep, setCurrentStep] = useState<'edit' | 'confirm' | 'success'>('edit')

  // Customer & Loan History state
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerLoans, setCustomerLoans] = useState<any[]>([])
  const [loadingCustomer, setLoadingCustomer] = useState(true)
  const [showAadhaar, setShowAadhaar] = useState(false)
  const [showAbortConfirm, setShowAbortConfirm] = useState(false)

  // New Loan Form Data
  const [formData, setFormData] = useState({
    amount: String(closedLoan.amount || closedLoan.loan_amount || '10000'),
    number_of_weeks: String(closedLoan.number_of_weeks || '25'),
    interest_rate: String(closedLoan.interest_rate || '5.25'),
    weekly_batch: String(closedLoan.weekly_batch || 'tuesday'),
    team_leader_id: String(closedLoan.team_leader_id || closedLoan.team_leader?.id || ''),
    loan_purpose: `Renewal of Loan #${String(closedLoan.id).slice(0, 8)}`,
    customer_bank_name: String(closedLoan.customer_bank_name || ''),
    account_number: String(closedLoan.account_number || ''),
    ifsc_code: String(closedLoan.ifsc_code || ''),
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdLoan, setCreatedLoan] = useState<Loan | null>(null)

  // Calculate default end date based on start_date + weeks
  useEffect(() => {
    if (formData.start_date && formData.number_of_weeks) {
      const weeks = parseInt(formData.number_of_weeks) || 0
      if (weeks > 0) {
        const start = new Date(formData.start_date)
        start.setDate(start.getDate() + weeks * 7)
        setFormData(prev => ({ ...prev, end_date: start.toISOString().split('T')[0] }))
      }
    }
  }, [formData.start_date, formData.number_of_weeks])

  // Load Customer & all historical loans
  useEffect(() => {
    loadCustomerAndLoanHistory()
  }, [closedLoan])

  const loadCustomerAndLoanHistory = async () => {
    setLoadingCustomer(true)
    try {
      // 1. Fetch customer by id, customer_id_display, or phone
      const targetCustomerId = closedLoan.customer?.id || closedLoan.customer_id
      const targetDisplayId = closedLoan.customer?.customer_id_display || closedLoan.customer_id_display
      const targetPhone = closedLoan.customer?.phone

      let cust: Customer | null = null

      if (targetCustomerId || targetDisplayId || targetPhone) {
        const matchCriteria = [
          targetCustomerId ? `id.eq.${targetCustomerId}` : null,
          targetDisplayId ? `customer_id_display.eq.${targetDisplayId}` : null,
          targetPhone ? `phone.eq.${targetPhone}` : null
        ].filter(Boolean).join(',')

        const { data: custData, error: custErr } = await supabase
          .from('customers')
          .select('*')
          .or(matchCriteria)
          .maybeSingle()

        if (!custErr && custData) {
          cust = custData as Customer
          setCustomer(custData as Customer)
        }
      }

      // 2. Fetch all loans for this customer
      if (cust) {
        const { data: allLoans } = await supabase
          .from('loans')
          .select('*')
          .or(`customer_id.eq.${cust.id},customer_id.eq.${cust.customer_id_display},customer_id.eq.${cust.phone}`)
          .order('created_at', { ascending: false })

        if (allLoans) {
          setCustomerLoans(allLoans)
        }

        // Pre-fill bank details if not already in closedLoan
        if (cust) {
          setFormData(prev => ({
            ...prev,
            customer_bank_name: prev.customer_bank_name || (cust as any).customer_bank_name || '',
            account_number: prev.account_number || (cust as any).account_number || '',
            ifsc_code: prev.ifsc_code || (cust as any).ifsc_code || ''
          }))
        }
      }
    } catch (err) {
      console.error('Error loading customer for renewal:', err)
    } finally {
      setLoadingCustomer(false)
    }
  }

  // --- Dynamic Loan Calculations ---
  // Weekly EMI = (Loan Amount × Interest Rate) ÷ 100
  // Total Repayment = Weekly EMI × Number of Weeks
  // Total Interest = Total Repayment - Loan Amount
  const amountNum = parseFloat(formData.amount) || 0
  const rateNum = parseFloat(formData.interest_rate) || 0
  const weeksNum = parseInt(formData.number_of_weeks) || 0

  const calcWeeklyEMI = () => {
    if (amountNum <= 0 || rateNum <= 0) return 0
    return Math.round(((amountNum * rateNum) / 100) * 100) / 100
  }

  const calcTotalRepayment = () => {
    const emi = calcWeeklyEMI()
    if (emi <= 0 || weeksNum <= 0) return amountNum
    return Math.round(emi * weeksNum * 100) / 100
  }

  const calcTotalInterest = () => {
    const totalRepay = calcTotalRepayment()
    return Math.max(0, Math.round((totalRepay - amountNum) * 100) / 100)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Auto-update rate when number_of_weeks changes
    if (field === 'number_of_weeks') {
      const weeks = parseInt(value) || 0
      let rate = ''
      if (weeks === 15) rate = '8.33'
      else if (weeks === 20) rate = '6.33'
      else if (weeks === 25) rate = '5.25'

      if (rate) {
        setFormData(prev => ({ ...prev, interest_rate: rate }))
      }
    }
  }

  // --- History & Overdue Analysis ---
  const activeLoansCount = customerLoans.filter(l => l.status === 'active').length
  const pendingLoansCount = customerLoans.filter(l => l.status === 'pending').length
  const completedLoansCount = customerLoans.filter(l => l.status === 'closed').length
  const overdueLoansCount = customerLoans.filter(
    l => l.status === 'active' && l.end_date && new Date(l.end_date) < new Date()
  ).length

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid loan amount greater than ₹0'
    }

    if (!formData.number_of_weeks || parseInt(formData.number_of_weeks) <= 0) {
      newErrors.number_of_weeks = 'Please select loan duration'
    }

    if (!formData.interest_rate || isNaN(Number(formData.interest_rate)) || Number(formData.interest_rate) <= 0) {
      newErrors.interest_rate = 'Please enter a valid interest rate'
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required'
    }

    if (!formData.team_leader_id) {
      newErrors.team_leader_id = 'Please select a Team Leader'
    }

    if (!formData.weekly_batch) {
      newErrors.weekly_batch = 'Please select a weekly batch'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      setCurrentStep('confirm')
    }
  }

  // --- Execute Renewal ---
  const handleConfirmRenewal = async () => {
    if (isSubmitting) return // Double-click guard
    setIsSubmitting(true)

    try {
      const resolvedCustomerId = customer?.id || closedLoan.customer?.id || closedLoan.customer_id

      if (!resolvedCustomerId) {
        throw new Error('Unable to resolve existing customer record. Cannot proceed with renewal.')
      }

      // Build new loan payload
      const newLoanData: any = {
        customer_id: resolvedCustomerId,
        amount: parseFloat(formData.amount),
        status: 'active',
        start_date: formData.start_date,
        end_date: formData.end_date,
        interest_rate: String(formData.interest_rate),
        number_of_weeks: parseInt(formData.number_of_weeks),
        team_leader_id: formData.team_leader_id,
        weekly_batch: formData.weekly_batch as 'tuesday' | 'thursday' | 'friday',
        loan_purpose: formData.loan_purpose || `Renewal of Loan #${String(closedLoan.id).slice(0, 8)}`,
        customer_bank_name: formData.customer_bank_name || null,
        account_number: formData.account_number || null,
        ifsc_code: formData.ifsc_code ? formData.ifsc_code.toUpperCase() : null
      }

      // Try inserting with previous_loan_id first
      let insertResult = await supabase
        .from('loans')
        .insert({
          ...newLoanData,
          previous_loan_id: closedLoan.id,
          renewed_at: new Date().toISOString(),
          renewal_notes: `Renewed from closed loan #${closedLoan.id}`
        })
        .select()
        .single()

      // If previous_loan_id column doesn't exist yet, retry without it
      if (insertResult.error && insertResult.error.message.includes('previous_loan_id')) {
        console.warn('previous_loan_id column not present in loans table, falling back to standard insert')
        insertResult = await supabase
          .from('loans')
          .insert(newLoanData)
          .select()
          .single()
      }

      if (insertResult.error || !insertResult.data) {
        throw insertResult.error || new Error('Failed to create new renewal loan')
      }

      const created = insertResult.data as Loan

      // Construct complete loan object for parent callback
      const fullNewLoan: Loan = {
        ...created,
        customer: customer || closedLoan.customer,
        team_leader: employees.find(e => e.id === formData.team_leader_id) || closedLoan.team_leader
      }

      setCreatedLoan(fullNewLoan)
      setCurrentStep('success')
      onSuccess(fullNewLoan)
    } catch (err: any) {
      console.error('Renewal creation error:', err)
      alert(`Error creating renewal loan: ${err.message || 'Please try again.'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Abort Workflow ---
  const handleAbort = () => {
    setShowAbortConfirm(true)
  }

  const confirmAbort = () => {
    setShowAbortConfirm(false)
    if (onAbort) {
      onAbort()
    } else {
      onClose()
    }
  }

  // Mask Aadhaar: ••••-••••-1234
  const maskAadhaar = (val?: string) => {
    if (!val) return 'Not Provided'
    const clean = val.replace(/\D/g, '')
    if (clean.length < 4) return val
    const last4 = clean.slice(-4)
    return `••••-••••-${last4}`
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Renew Loan Application</h2>
              <p className="text-blue-100 text-xs">
                Creating new loan for existing customer • Original closed loan remains permanently unchanged
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAbort}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white border border-red-300/30 transition-colors"
              title="Abort Renewal"
            >
              ✕ Abort
            </button>
            <button
              type="button"
              onClick={handleAbort}
              className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {loadingCustomer ? (
            <div className="py-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm">Loading customer identity and previous loan data...</p>
            </div>
          ) : currentStep === 'success' ? (
            /* --- Success Screen --- */
            <div className="py-8 px-4 text-center space-y-5">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900">Loan Renewal Created Successfully!</h3>
                <p className="text-sm text-gray-600 mt-1">
                  A new active loan has been issued for <strong>{customer?.name || closedLoan.customer?.name}</strong>.
                </p>
              </div>

              {/* Summary of created loan */}
              <div className="max-w-lg mx-auto bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500">New Loan ID</span>
                  <span className="font-mono font-semibold text-gray-900">{getLoanDisplayId(createdLoan)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500">Customer ID</span>
                  <span className="font-semibold text-gray-900">{customer?.customer_id_display || closedLoan.customer_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500">New Principal Amount</span>
                  <span className="font-bold text-gray-900">{formatCurrency(Number(formData.amount))}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500">Duration & Rate</span>
                  <span className="font-semibold text-gray-900">{formData.number_of_weeks} Weeks @ {formData.interest_rate}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500">Weekly EMI</span>
                  <span className="font-bold text-blue-700">{formatCurrency(calcWeeklyEMI())}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500">Total Repayment Amount</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(calcTotalRepayment())}</span>
                </div>
                <div className="flex justify-between py-1 text-emerald-800">
                  <span className="font-medium">Previous Closed Loan {getLoanDisplayId(closedLoan)}</span>
                  <span className="font-semibold">Remains Closed ✓</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-md transition-colors"
                >
                  Done & Back to Closed Loans
                </button>
              </div>
            </div>
          ) : currentStep === 'confirm' ? (
            /* --- Confirmation Step (Step 4) --- */
            <div className="space-y-6">
              {/* Existing Loans Warning */}
              {(activeLoansCount > 0 || overdueLoansCount > 0) && (
                <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-amber-800 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span>Customer Credit Warning</span>
                  </div>
                  <p className="text-xs text-amber-700">
                    This customer currently has <strong>{activeLoansCount} active loan(s)</strong>
                    {overdueLoansCount > 0 && <span className="text-red-700 font-bold">, including {overdueLoansCount} OVERDUE</span>}.
                    Please verify repayment capability before confirming this renewal.
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  Confirmation: Review Loan Renewal Details
                </h3>
                <p className="text-xs text-blue-700">
                  Confirm the details below. This will create a <strong>brand new loan</strong> linked to the same customer,
                  while keeping the original closed loan unchanged.
                </p>
              </div>

              {/* Side-by-Side Comparison: Previous Loan vs New Renewal Loan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Previous Loan Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">Previous Closed Loan</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Closed
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Loan ID</span>
                    <span className="font-mono text-gray-800">{String(closedLoan.id).slice(0, 10)}...</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Principal Amount</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(closedLoan.amount || closedLoan.loan_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Duration</span>
                    <span className="text-gray-800">{closedLoan.number_of_weeks || 'N/A'} Weeks</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Interest Rate</span>
                    <span className="text-gray-800">{closedLoan.interest_rate || '0'}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Closing Date</span>
                    <span className="text-gray-800">{closedLoan.end_date ? formatDate(closedLoan.end_date) : 'Closed'}</span>
                  </div>
                </div>

                {/* New Loan Card */}
                <div className="bg-indigo-50/60 border-2 border-indigo-200 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                    <span className="font-bold text-indigo-900 uppercase tracking-wider text-[11px]">New Renewal Loan</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                      New Active
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">New Principal</span>
                    <span className="font-bold text-indigo-950 text-sm">{formatCurrency(amountNum)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Duration & Rate</span>
                    <span className="font-semibold text-indigo-900">{weeksNum} Weeks @ {rateNum}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Weekly EMI</span>
                    <span className="font-bold text-blue-700">{formatCurrency(calcWeeklyEMI())}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Total Repayment</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(calcTotalRepayment())}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Start to End Date</span>
                    <span className="text-gray-800">{formatDate(formData.start_date)} to {formatDate(formData.end_date)}</span>
                  </div>
                </div>
              </div>

              {/* Customer Portfolio Snapshot */}
              <div className="bg-gray-50 border rounded-xl p-4 text-xs space-y-2">
                <span className="font-bold text-gray-700 uppercase tracking-wider text-[11px] block">
                  Customer Portfolio Statistics
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                  <div className="p-2 bg-white rounded border">
                    <span className="text-gray-400 block text-[10px]">Total Loans Ever</span>
                    <span className="font-bold text-gray-800 text-sm">{customerLoans.length}</span>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <span className="text-gray-400 block text-[10px]">Completed Loans</span>
                    <span className="font-bold text-emerald-700 text-sm">{completedLoansCount}</span>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <span className="text-gray-400 block text-[10px]">Currently Active</span>
                    <span className="font-bold text-blue-700 text-sm">{activeLoansCount}</span>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <span className="text-gray-400 block text-[10px]">Overdue Loans</span>
                    <span className={`font-bold text-sm ${overdueLoansCount > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                      {overdueLoansCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Step 4 */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep('edit')}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
                >
                  ← Back to Edit
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAbort}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                  >
                    Abort Renewal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRenewal}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                        <span>Creating New Loan...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Confirm & Issue New Loan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* --- Edit Step (Step 1, 2, 3) --- */
            <form onSubmit={handleProceedToConfirm} className="space-y-6">
              {/* Reuse Customer Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800">
                  <p className="font-bold">Reusing Existing Customer Record</p>
                  <p className="text-emerald-700 mt-0.5">
                    Customer ID <strong>{customer?.customer_id_display || closedLoan.customer_id}</strong>, verified documents,
                    and contact records are preserved. No duplicate customer will be created in the database.
                  </p>
                </div>
              </div>

              {/* Section 1: Customer Details (Read-only verified data) */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Customer Information
                  </h3>
                  <span className="text-xs text-gray-500 font-mono">
                    ID: {customer?.customer_id_display || closedLoan.customer_id}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="text-gray-500 block mb-0.5">Customer Name</label>
                    <p className="font-semibold text-gray-900">{customer?.name || closedLoan.customer?.name || 'N/A'}</p>
                    {customer?.relationship && (
                      <p className="text-[11px] text-gray-500">Rel: {customer.relationship}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-0.5">Primary Mobile Number</label>
                    <p className="font-semibold text-gray-900">{customer?.phone || closedLoan.customer?.phone || 'N/A'}</p>
                    {customer?.is_mobile_verified && (
                      <span className="text-[10px] text-green-700 font-medium">✓ Mobile Verified</span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-gray-500 block mb-0.5">Aadhaar Number</label>
                      <button
                        type="button"
                        onClick={() => setShowAadhaar(!showAadhaar)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {showAadhaar ? 'Mask' : 'Show'}
                      </button>
                    </div>
                    <p className="font-mono text-gray-900">
                      {showAadhaar ? (customer?.aadhaar_number || 'N/A') : maskAadhaar(customer?.aadhaar_number)}
                    </p>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-0.5">PAN Number</label>
                    <p className="font-mono text-gray-900">{customer?.pan_number || 'N/A'}</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-gray-500 block mb-0.5">Address</label>
                    <p className="text-gray-800 line-clamp-2">{customer?.address || closedLoan.customer?.address || 'N/A'}</p>
                  </div>

                  {/* Additional Mobile 1 */}
                  {customer?.additional_mobile_1 && (
                    <div>
                      <label className="text-gray-500 block mb-0.5">Additional Mobile 1</label>
                      <p className="text-gray-900 font-medium">{customer.additional_mobile_1}</p>
                      {customer.additional_mobile_1_name && (
                        <p className="text-[11px] text-gray-500">{customer.additional_mobile_1_name} ({customer.additional_mobile_1_relationship || 'Rel'})</p>
                      )}
                    </div>
                  )}

                  {/* Additional Mobile 2 */}
                  {customer?.additional_mobile_2 && (
                    <div>
                      <label className="text-gray-500 block mb-0.5">Additional Mobile 2</label>
                      <p className="text-gray-900 font-medium">{customer.additional_mobile_2}</p>
                      {customer.additional_mobile_2_name && (
                        <p className="text-[11px] text-gray-500">{customer.additional_mobile_2_name} ({customer.additional_mobile_2_relationship || 'Rel'})</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Previous Closed Loan Summary */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                  <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-700" />
                    Reference Closed Loan
                  </h4>
                  <span className="text-[11px] font-mono text-blue-700">
                    Loan ID: {String(closedLoan.id).slice(0, 8)}...
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-blue-950 pt-1">
                  <div>
                    <span className="text-blue-600 block text-[11px]">Previous Principal</span>
                    <span className="font-bold text-sm">{formatCurrency(closedLoan.amount || closedLoan.loan_amount || 0)}</span>
                  </div>
                  <div>
                    <span className="text-blue-600 block text-[11px]">Previous Duration</span>
                    <span className="font-semibold">{closedLoan.number_of_weeks || 'N/A'} Weeks</span>
                  </div>
                  <div>
                    <span className="text-blue-600 block text-[11px]">Interest Rate</span>
                    <span className="font-semibold">{closedLoan.interest_rate || '0'}%</span>
                  </div>
                  <div>
                    <span className="text-blue-600 block text-[11px]">Closed Date</span>
                    <span className="font-semibold">{closedLoan.end_date ? formatDate(closedLoan.end_date) : 'Closed'}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: New Loan Configuration Form */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  New Loan Terms & Configuration
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Loan Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      New Loan Amount (₹) *
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                        errors.amount ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="e.g. 20000"
                      min="1000"
                      step="500"
                    />
                    {errors.amount && <p className="text-[11px] text-red-600 mt-0.5">{errors.amount}</p>}
                  </div>

                  {/* Duration / Number of Weeks */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Duration (Number of Weeks) *
                    </label>
                    <select
                      value={formData.number_of_weeks}
                      onChange={(e) => handleInputChange('number_of_weeks', e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="15">15 Weeks (8.33%)</option>
                      <option value="20">20 Weeks (6.33%)</option>
                      <option value="25">25 Weeks (5.25%)</option>
                    </select>
                  </div>

                  {/* Interest Rate */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Interest Rate (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.interest_rate}
                      onChange={(e) => handleInputChange('interest_rate', e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. 5.25"
                    />
                  </div>

                  {/* Weekly Batch */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Weekly Collection Batch *
                    </label>
                    <select
                      value={formData.weekly_batch}
                      onChange={(e) => handleInputChange('weekly_batch', e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none capitalize"
                    >
                      <option value="tuesday">Tuesday Batch</option>
                      <option value="thursday">Thursday Batch</option>
                      <option value="friday">Friday Batch</option>
                    </select>
                  </div>

                  {/* Team Leader */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Team Leader *
                    </label>
                    <select
                      value={formData.team_leader_id}
                      onChange={(e) => handleInputChange('team_leader_id', e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                        errors.team_leader_id ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Team Leader</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} {emp.leader_id ? `(${emp.leader_id})` : ''}
                        </option>
                      ))}
                    </select>
                    {errors.team_leader_id && <p className="text-[11px] text-red-600 mt-0.5">{errors.team_leader_id}</p>}
                  </div>

                  {/* Loan Purpose */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Loan Purpose
                    </label>
                    <input
                      type="text"
                      value={formData.loan_purpose}
                      onChange={(e) => handleInputChange('loan_purpose', e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. Business renewal"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      End Date (Auto-calculated)
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      readOnly
                      className="w-full px-3 py-2 text-xs border border-gray-200 bg-gray-50 rounded-lg text-gray-600 outline-none"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      Start date + {formData.number_of_weeks || 0} weeks
                    </span>
                  </div>
                </div>

                {/* Bank Details (Pre-filled / editable) */}
                <div className="pt-2 border-t">
                  <span className="text-xs font-semibold text-gray-700 block mb-2">Disbursement Bank Details</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Bank Name"
                      value={formData.customer_bank_name}
                      onChange={(e) => handleInputChange('customer_bank_name', e.target.value)}
                      className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={formData.account_number}
                      onChange={(e) => handleInputChange('account_number', e.target.value)}
                      className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="IFSC Code"
                      value={formData.ifsc_code}
                      onChange={(e) => handleInputChange('ifsc_code', e.target.value.toUpperCase())}
                      className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                      maxLength={11}
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Calculation Summary Card (Mandatory 6-tile metrics) */}
              <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white rounded-xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                    Live Repayment Calculation
                  </span>
                  <span className="text-[11px] text-blue-200">
                    Formula: (Amount × Rate) ÷ 100
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
                  <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur-xs">
                    <span className="text-[10px] text-blue-200 block uppercase">Loan Amount</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">{formatCurrency(amountNum)}</span>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur-xs">
                    <span className="text-[10px] text-blue-200 block uppercase">Rate</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">{rateNum}%</span>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur-xs">
                    <span className="text-[10px] text-blue-200 block uppercase">Duration</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">{weeksNum} wks</span>
                  </div>
                  <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-lg p-2.5 backdrop-blur-xs">
                    <span className="text-[10px] text-emerald-300 block uppercase font-semibold">Weekly EMI</span>
                    <span className="text-sm font-extrabold text-emerald-300 mt-0.5 block">
                      {formatCurrency(calcWeeklyEMI())}
                    </span>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur-xs">
                    <span className="text-[10px] text-blue-200 block uppercase font-semibold">Total Repayment</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {formatCurrency(calcTotalRepayment())}
                    </span>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur-xs">
                    <span className="text-[10px] text-blue-200 block uppercase font-semibold">Total Interest</span>
                    <span className="text-sm font-bold text-amber-300 mt-0.5 block">
                      {formatCurrency(calcTotalInterest())}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Navigation Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleAbort}
                  className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                >
                  ✕ Abort Renewal
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                  >
                    <span>Review & Proceed</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* --- Abort Confirmation Dialog --- */}
      {showAbortConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Abort Renewal Process?</h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to cancel the renewal for this closed loan?
              <br />
              <strong>Any unsaved new loan details will be discarded.</strong>
              <br /><br />
              The original closed loan <strong>{getLoanDisplayId(closedLoan)}</strong> and its complete payment history
              will remain <strong>completely unchanged and visible</strong> on the Closed Loans page.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAbortConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Continue Renewal
              </button>
              <button
                type="button"
                onClick={confirmAbort}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
              >
                Yes, Abort Renewal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

