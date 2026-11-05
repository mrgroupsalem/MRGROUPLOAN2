'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loan, Customer, Collection } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getLoanDisplayId } from '@/lib/loanIdGenerator'
import {
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RefreshCw,
  Eye,
  X
} from 'lucide-react'

export interface CustomerLoanHistoryProps {
  customerId: string
  customer?: Customer | null
  onClose?: () => void
  onRenewLoan?: (loan: any) => void
  showRenewAction?: boolean
}

export interface LoanWithCollections extends Loan {
  collections?: Collection[]
  total_collected?: number
  outstanding_balance?: number
  weekly_emi?: number
  total_repayment?: number
  is_overdue?: boolean
}

export default function CustomerLoanHistory({
  customerId,
  customer: initialCustomer,
  onClose,
  onRenewLoan,
  showRenewAction = false
}: CustomerLoanHistoryProps) {
  const [customer, setCustomer] = useState<Customer | null>(initialCustomer || null)
  const [loans, setLoans] = useState<LoanWithCollections[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null)
  const [selectedRepaymentLoan, setSelectedRepaymentLoan] = useState<LoanWithCollections | null>(null)

  useEffect(() => {
    loadCustomerAndHistory()
  }, [customerId])

  const loadCustomerAndHistory = async () => {
    if (!customerId) return
    setLoading(true)
    setError(null)

    try {
      // 1. Fetch customer if not already provided or if partial
      let resolvedCustomer = initialCustomer || null
      if (!resolvedCustomer || !resolvedCustomer.name) {
        const { data: custData, error: custErr } = await supabase
          .from('customers')
          .select('*')
          .or(`id.eq.${customerId},customer_id_display.eq.${customerId},phone.eq.${customerId}`)
          .maybeSingle()

        if (!custErr && custData) {
          resolvedCustomer = custData as Customer
          setCustomer(custData as Customer)
        }
      }

      // 2. Fetch all loans for this customer matching UUID, display ID, or phone
      const matchCriteria = [
        `customer_id.eq.${customerId}`,
        resolvedCustomer?.id ? `customer_id.eq.${resolvedCustomer.id}` : null,
        resolvedCustomer?.customer_id_display ? `customer_id.eq.${resolvedCustomer.customer_id_display}` : null,
        resolvedCustomer?.phone ? `customer_id.eq.${resolvedCustomer.phone}` : null
      ].filter(Boolean).join(',')

      const { data: loansData, error: loansErr } = await supabase
        .from('loans')
        .select('*')
        .or(matchCriteria)
        .order('created_at', { ascending: false })

      if (loansErr) throw loansErr

      const fetchedLoans: Loan[] = (loansData || []) as Loan[]

      // 3. Fetch collections for these loans
      const loanIds = fetchedLoans.map(l => l.id)
      let collectionsMap: Record<string, Collection[]> = {}

      if (loanIds.length > 0) {
        const { data: colsData } = await supabase
          .from('collections')
          .select('*')
          .in('loan_id', loanIds)
          .order('collection_date', { ascending: false })

        if (colsData) {
          colsData.forEach((col: any) => {
            if (!collectionsMap[col.loan_id]) {
              collectionsMap[col.loan_id] = []
            }
            collectionsMap[col.loan_id].push(col as Collection)
          })
        }
      }

      // 4. Calculate detailed repayment stats for each loan
      const enrichedLoans: LoanWithCollections[] = fetchedLoans.map((loan) => {
        const rate = parseFloat(loan.interest_rate || '0')
        const weeks = loan.number_of_weeks || 0
        const amount = Number(loan.amount) || 0

        // Weekly EMI = (Loan Amount × Interest Rate) ÷ 100
        const weeklyEmi = (amount > 0 && rate > 0) ? Math.round(((amount * rate) / 100) * 100) / 100 : 0
        // Total Repayment = Weekly EMI × Number of Weeks
        const totalRepayment = (weeklyEmi > 0 && weeks > 0) ? Math.round(weeklyEmi * weeks * 100) / 100 : amount

        const loanCollections = collectionsMap[loan.id] || []
        const totalCollected = loanCollections.reduce((sum, c) => sum + (Number(c.amount_collected) || 0), 0)
        const outstanding = Math.max(0, totalRepayment - totalCollected)

        const isOverdue = Boolean(
          loan.status === 'active' &&
          loan.end_date &&
          new Date(loan.end_date) < new Date() &&
          outstanding > 0
        )

        return {
          ...loan,
          collections: loanCollections,
          total_collected: totalCollected,
          outstanding_balance: loan.status === 'closed' ? 0 : outstanding,
          weekly_emi: weeklyEmi,
          total_repayment: totalRepayment,
          is_overdue: isOverdue
        }
      })

      // Sort by start_date or created_at descending (newest first)
      enrichedLoans.sort((a, b) => {
        const da = new Date(a.start_date || a.created_at).getTime()
        const db = new Date(b.start_date || b.created_at).getTime()
        return db - da
      })

      setLoans(enrichedLoans)
    } catch (err: any) {
      console.error('Error loading loan history:', err)
      setError(err.message || 'Failed to load customer loan history')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // --- Aggregate Statistics Calculations ---
  const totalLoans = loans.length
  const completedLoans = loans.filter(l => l.status === 'closed').length
  const activeLoans = loans.filter(l => l.status === 'active').length
  const pendingLoans = loans.filter(l => l.status === 'pending').length
  const overdueLoans = loans.filter(l => l.is_overdue).length

  const totalBorrowed = loans.reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
  const totalCollected = loans.reduce((sum, l) => sum + (l.total_collected || 0), 0)
  const totalOutstanding = loans.reduce((sum, l) => sum + (l.outstanding_balance || 0), 0)

  const mostRecentLoan = loans[0] || null

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Customer Loan History</h2>
            {customer?.customer_id_display && (
              <span className="bg-blue-900 bg-opacity-60 text-blue-200 text-xs px-2.5 py-1 rounded-full font-mono border border-blue-400 border-opacity-30">
                ID: {customer.customer_id_display}
              </span>
            )}
          </div>
          <p className="text-blue-100 text-sm mt-0.5">
            {customer?.name || 'Customer'} {customer?.phone ? `• ${customer.phone}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCustomerAndHistory}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto p-6 space-y-6 flex-1">
        {loading ? (
          <div className="py-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm">Loading complete customer loan history...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            {/* Warning if Customer has Active, Pending, or Overdue Loans */}
            {(activeLoans > 0 || overdueLoans > 0 || pendingLoans > 0) && (
              <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-amber-800 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Existing Loan Notice</span>
                </div>
                <p className="text-xs text-amber-700">
                  This customer currently has{' '}
                  <strong>{activeLoans} active loan(s)</strong>
                  {overdueLoans > 0 && <span className="text-red-700">, including <strong>{overdueLoans} overdue</strong></span>}
                  {pendingLoans > 0 && <span>, and <strong>{pendingLoans} pending</strong> approval</span>}.
                  Outstanding balance across all loans: <strong>{formatCurrency(totalOutstanding)}</strong>.
                </p>
              </div>
            )}

            {/* Customer Summary Statistics Cards (8 metrics) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Loans</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalLoans}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Lifetime applications</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Completed / Closed</p>
                <p className="text-2xl font-bold text-emerald-800 mt-1">{completedLoans}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Fully paid off</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">Active Loans</p>
                <p className="text-2xl font-bold text-blue-800 mt-1">{activeLoans}</p>
                <p className="text-[11px] text-blue-600 mt-0.5">Ongoing repayments</p>
              </div>

              <div className={`p-3 rounded-lg border ${overdueLoans > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-xs font-medium uppercase tracking-wider ${overdueLoans > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                  Overdue Loans
                </p>
                <p className={`text-2xl font-bold mt-1 ${overdueLoans > 0 ? 'text-red-800' : 'text-gray-900'}`}>
                  {overdueLoans}
                </p>
                <p className={`text-[11px] mt-0.5 ${overdueLoans > 0 ? 'text-red-600' : 'text-gray-500'}`}>Past due date</p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <p className="text-xs font-medium text-indigo-700 uppercase tracking-wider">Total Borrowed</p>
                <p className="text-lg font-bold text-indigo-900 mt-1">{formatCurrency(totalBorrowed)}</p>
                <p className="text-[11px] text-indigo-600 mt-0.5">Principal amount</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wider">Total Collected</p>
                <p className="text-lg font-bold text-green-900 mt-1">{formatCurrency(totalCollected)}</p>
                <p className="text-[11px] text-green-600 mt-0.5">Actual payments</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Total Outstanding</p>
                <p className="text-lg font-bold text-amber-900 mt-1">{formatCurrency(totalOutstanding)}</p>
                <p className="text-[11px] text-amber-600 mt-0.5">Remaining to collect</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs font-medium text-purple-700 uppercase tracking-wider">Recent Loan</p>
                <p className="text-lg font-bold text-purple-900 mt-1">
                  {mostRecentLoan ? formatCurrency(mostRecentLoan.amount) : '₹0'}
                </p>
                <p className="text-[11px] text-purple-600 mt-0.5">
                  {mostRecentLoan?.start_date ? formatDate(mostRecentLoan.start_date) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Loan History Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Loan History Records ({loans.length})
                </h3>
                <span className="text-xs text-gray-500">Ordered by most recent first</span>
              </div>

              {loans.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No historical loan records found for this customer.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                    <thead className="bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5">Seq #</th>
                        <th className="px-3 py-2.5">Loan ID</th>
                        <th className="px-3 py-2.5">Start / End</th>
                        <th className="px-3 py-2.5">Loan Amount</th>
                        <th className="px-3 py-2.5">Rate / Weeks</th>
                        <th className="px-3 py-2.5">Weekly EMI</th>
                        <th className="px-3 py-2.5">Total Repayment</th>
                        <th className="px-3 py-2.5">Collected</th>
                        <th className="px-3 py-2.5">Outstanding</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {loans.map((loan, idx) => {
                        const seqNumber = loans.length - idx
                        const isExpanded = expandedLoanId === loan.id

                        return (
                          <React.Fragment key={loan.id}>
                            <tr className={`hover:bg-blue-50/50 transition-colors ${loan.status === 'closed' ? 'bg-gray-50/50' : ''}`}>
                              {/* Sequence */}
                              <td className="px-3 py-3 font-semibold text-gray-700">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-[11px] font-bold text-gray-800">
                                    {seqNumber}
                                  </span>
                                  {loan.previous_loan_id && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 font-medium">
                                      Renewed
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Loan ID */}
                              <td className="px-3 py-3 font-mono text-[11px] text-gray-900">
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-gray-900">{getLoanDisplayId(loan)}</span>
                                  <button
                                    onClick={() => copyToClipboard(getLoanDisplayId(loan), loan.id)}
                                    className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
                                    title="Copy Loan ID"
                                  >
                                    {copiedId === loan.id ? (
                                      <Check className="w-3.5 h-3.5 text-green-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                                {loan.previous_loan_id && (
                                  <p className="text-[10px] text-indigo-600 mt-0.5">
                                    Prev: {getLoanDisplayId({ id: loan.previous_loan_id })}
                                  </p>
                                )}
                              </td>

                              {/* Start / End Date */}
                              <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                  <span>{loan.start_date ? formatDate(loan.start_date) : 'N/A'}</span>
                                </div>
                                <div className="text-[11px] text-gray-400 pl-4.5">
                                  to {loan.end_date ? formatDate(loan.end_date) : 'N/A'}
                                </div>
                              </td>

                              {/* Loan Amount */}
                              <td className="px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                {formatCurrency(loan.amount)}
                              </td>

                              {/* Rate & Weeks */}
                              <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                                <span className="font-medium">{loan.interest_rate || '0'}%</span>
                                <span className="text-gray-500 text-[11px]"> ({loan.number_of_weeks || 0}w)</span>
                              </td>

                              {/* Weekly EMI */}
                              <td className="px-3 py-3 text-gray-900 whitespace-nowrap">
                                {formatCurrency(loan.weekly_emi || 0)}
                              </td>

                              {/* Total Repayment */}
                              <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">
                                {formatCurrency(loan.total_repayment || 0)}
                              </td>

                              {/* Collected */}
                              <td className="px-3 py-3 text-emerald-700 font-semibold whitespace-nowrap">
                                {formatCurrency(loan.total_collected || 0)}
                              </td>

                              {/* Outstanding */}
                              <td className="px-3 py-3 font-semibold whitespace-nowrap">
                                {loan.status === 'closed' ? (
                                  <span className="text-gray-400">₹0</span>
                                ) : (
                                  <span className={loan.is_overdue ? 'text-red-600 font-bold' : 'text-amber-700'}>
                                    {formatCurrency(loan.outstanding_balance || 0)}
                                  </span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                {loan.status === 'closed' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                    <CheckCircle className="w-3 h-3" /> Closed
                                  </span>
                                ) : loan.is_overdue ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 animate-pulse">
                                    <AlertTriangle className="w-3 h-3" /> Overdue
                                  </span>
                                ) : loan.status === 'active' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                                    <Clock className="w-3 h-3" /> Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                    Pending
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-3 py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRepaymentLoan(loan)}
                                    className="px-2 py-1 text-[11px] font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors inline-flex items-center gap-1"
                                    title="Inspect Repayments & Collections"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Collections ({loan.collections?.length || 0})</span>
                                  </button>

                                  {showRenewAction && loan.status === 'closed' && onRenewLoan && (
                                    <button
                                      type="button"
                                      onClick={() => onRenewLoan(loan)}
                                      className="px-2 py-1 text-[11px] font-semibold rounded text-white bg-blue-600 hover:bg-blue-700 transition-colors inline-flex items-center gap-1 shadow-sm"
                                      title="Renew this closed loan"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      <span>Renew</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Repayment / Collections Inspector Modal */}
      {selectedRepaymentLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Repayment & Collection History
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Loan ID: {getLoanDisplayId(selectedRepaymentLoan)}
                </p>
              </div>
              <button
                onClick={() => setSelectedRepaymentLoan(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Loan Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg text-center text-xs">
              <div>
                <span className="text-gray-500">Loan Amount</span>
                <p className="font-bold text-gray-900 mt-0.5">{formatCurrency(selectedRepaymentLoan.amount)}</p>
              </div>
              <div>
                <span className="text-gray-500">Total Collected</span>
                <p className="font-bold text-emerald-700 mt-0.5">{formatCurrency(selectedRepaymentLoan.total_collected || 0)}</p>
              </div>
              <div>
                <span className="text-gray-500">Remaining</span>
                <p className="font-bold text-amber-700 mt-0.5">{formatCurrency(selectedRepaymentLoan.outstanding_balance || 0)}</p>
              </div>
            </div>

            {/* Collections List */}
            {(!selectedRepaymentLoan.collections || selectedRepaymentLoan.collections.length === 0) ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                No collection records logged for this loan yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto border rounded-lg">
                {selectedRepaymentLoan.collections.map((col, cIdx) => (
                  <div key={col.id || cIdx} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-700">+{formatCurrency(col.amount_collected)}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">{formatDate(col.collection_date)}</span>
                      </div>
                      {col.notes && <p className="text-[11px] text-gray-500 mt-0.5">{col.notes}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-gray-400">Balance:</span>
                      <span className="text-xs font-medium text-gray-700 ml-1">{formatCurrency(col.remaining_balance)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedRepaymentLoan(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
        <span>Total Records: {loans.length} loan(s)</span>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-md transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  )
}
