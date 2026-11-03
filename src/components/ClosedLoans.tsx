'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Employee, Customer, Loan } from '@/types'
import { getLoanDisplayId } from '@/lib/loanIdGenerator'
import RenewLoanModal from './RenewLoanModal'
import CustomerLoanHistory from './CustomerLoanHistory'
import EditLoanForm from './EditLoanForm'
import ConfirmDeleteModal from './dashboard/ConfirmDeleteModal'
import PhotoLightbox from './ui/PhotoLightbox'
import ClosedLoanSummaryStrip from './closed-loans/ClosedLoanSummaryStrip'
import ClosedLoanActions from './closed-loans/ClosedLoanActions'
import DisbursementInfo from './ui/DisbursementInfo'
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  User,
  CreditCard,
  X,
  Clock,
  Sparkles,
  ArrowLeft,
  Calendar,
} from 'lucide-react'

export default function ClosedLoans({ onBack }: { onBack: () => void }) {
  const [loans, setLoans] = useState<any[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  // Filters state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLeader, setSelectedLeader] = useState('all')
  const [selectedBatch, setSelectedBatch] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  // Modals state
  const [renewingLoan, setRenewingLoan] = useState<any | null>(null)
  const [historyCustomer, setHistoryCustomer] = useState<{ id: string; customer?: Customer } | null>(null)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [deletingLoan, setDeletingLoan] = useState<any | null>(null)
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; title: string } | null>(null)

  // Notification / Toast state
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadClosedLoans()
  }, [])

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type })
    setTimeout(() => {
      setNotification(null)
    }, 5000)
  }

  const loadClosedLoans = async () => {
    setLoading(true)
    try {
      const [closedRes, loansRes, customersRes, employeesRes, collectionsRes] = await Promise.all([
        supabase.from('closed_loans').select('*'),
        supabase.from('loans').select('*').eq('status', 'closed'),
        supabase.from('customers').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('collections').select('loan_id, amount_collected'),
      ])

      const custs: Customer[] = (customersRes.data || []) as Customer[]
      const emps: Employee[] = (employeesRes.data || []) as Employee[]
      const cols: any[] = collectionsRes.data || []

      setCustomers(custs)
      setEmployees(emps)

      // Map collections total by loan_id
      const collectionsTotalByLoan: Record<string, number> = {}
      cols.forEach((c) => {
        collectionsTotalByLoan[c.loan_id] =
          (collectionsTotalByLoan[c.loan_id] || 0) + (Number(c.amount_collected) || 0)
      })

      let rawClosedList: any[] = []
      if (loansRes.data && loansRes.data.length > 0) {
        rawClosedList = loansRes.data
      } else if (closedRes.data && closedRes.data.length > 0) {
        rawClosedList = closedRes.data
      }

      const mappedLoans = rawClosedList.map((l: any) => {
        const customer =
          custs.find(
            (c: any) =>
              c.id === l.customer_id ||
              c.customer_id_display === l.customer_id ||
              c.phone === l.customer_id
          ) || l.customer || null

        const teamLeader =
          emps.find((e: any) => e.id === l.team_leader_id || e.id === l.team_leader?.id) ||
          l.team_leader ||
          null

        const amount = Number(l.amount || l.loan_amount || 0)
        const rate = Number(l.interest_rate || 8.33)
        const weeks = Number(l.number_of_weeks || 15)

        // Calculate expected repayment
        const weeklyEmi = amount > 0 && rate > 0 ? Math.round(((amount * rate) / 100) * 100) / 100 : 0
        const totalRepay = weeklyEmi > 0 && weeks > 0 ? Math.round(weeklyEmi * weeks * 100) / 100 : amount

        // Actual collected from collections table
        const collected =
          collectionsTotalByLoan[l.id] || Number(l.total_amount_paid) || totalRepay

        const profit = Math.max(0, collected - amount)

        // Determine closure status badge
        const expectedEndDate = l.end_date ? new Date(l.end_date) : null
        const closureDate = l.updated_at ? new Date(l.updated_at) : new Date(l.created_at)

        let closureStatus: 'on_time' | 'late' | 'settled' = 'on_time'
        if (expectedEndDate && closureDate.getTime() > expectedEndDate.getTime() + 7 * 24 * 60 * 60 * 1000) {
          closureStatus = 'late'
        } else if (collected < totalRepay) {
          closureStatus = 'settled'
        }

        return {
          ...l,
          id: l.id,
          loan_id: l.id,
          amount,
          loan_amount: amount,
          interest_rate: rate,
          number_of_weeks: weeks,
          weekly_emi: weeklyEmi,
          total_repayment: totalRepay,
          total_collected: collected,
          profit,
          closureStatus,
          start_date: l.start_date,
          end_date: l.end_date,
          closure_date: l.end_date || l.updated_at || l.created_at,
          customer_id: customer?.customer_id_display || customer?.id || l.customer_id,
          customer_name: customer?.name || l.customer_name || 'Borrower',
          customer: customer || {
            id: l.customer_id,
            name: l.customer_name || 'Borrower',
            customer_id_display: l.customer_id,
          },
          team_leader_id: teamLeader?.id || l.team_leader_id || null,
          team_leader_name: teamLeader?.name || l.team_leader_name || '',
          team_leader: teamLeader || { id: l.team_leader_id, name: l.team_leader_name || 'N/A' },
          weekly_batch: l.weekly_batch || 'tuesday',
          loan_purpose: l.loan_purpose,
          status: 'closed',
        }
      })

      setLoans(mappedLoans)
    } catch (err) {
      console.error('Error loading closed loans:', err)
      showNotification('Error loading closed loans. Please refresh.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      // Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const name = (loan.customer?.name || loan.customer_name || '').toLowerCase()
        const custId = String(
          loan.customer?.customer_id_display || loan.customer_id || ''
        ).toLowerCase()
        const phone = String(loan.customer?.phone || '').toLowerCase()
        const loanId = String(loan.id || '').toLowerCase()
        const displayId = getLoanDisplayId(loan).toLowerCase()
        const matches =
          name.includes(term) ||
          custId.includes(term) ||
          phone.includes(term) ||
          loanId.includes(term) ||
          displayId.includes(term)
        if (!matches) return false
      }

      // Leader Filter
      if (selectedLeader !== 'all' && loan.team_leader_id !== selectedLeader) {
        return false
      }

      // Batch Day Filter
      if (selectedBatch !== 'all' && loan.weekly_batch !== selectedBatch) {
        return false
      }

      // Closure Status Filter
      if (selectedStatus !== 'all' && loan.closureStatus !== selectedStatus) {
        return false
      }

      return true
    })
  }, [loans, searchTerm, selectedLeader, selectedBatch, selectedStatus])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalLoans = loans.length
    const totalDisbursed = loans.reduce((s, l) => s + (l.amount || 0), 0)
    const totalCollected = loans.reduce((s, l) => s + (l.total_collected || 0), 0)
    const totalProfit = loans.reduce((s, l) => s + (l.profit || 0), 0)
    return { totalLoans, totalDisbursed, totalCollected, totalProfit }
  }, [loans])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Download Loan Closure Statement / Certificate
  const handleDownloadStatement = (loan: any) => {
    const loanDisplay = getLoanDisplayId(loan)
    const custName = loan.customer?.name || 'Customer'
    const dateStr = formatDate(loan.closure_date)

    const content = `
======================================================================
                  MR GROUPS - LOAN CLOSURE STATEMENT
======================================================================
Customer Name:      ${custName}
Customer ID:        ${loan.customer?.customer_id_display || loan.customer_id}
Contact Number:     ${loan.customer?.phone || 'N/A'}
Loan ID:            ${loanDisplay}
Weekly Batch:       ${(loan.weekly_batch || 'Tuesday').toUpperCase()}
Team Leader:        ${loan.team_leader?.name || 'Assigned Leader'}

FINANCIAL DETAILS:
----------------------------------------------------------------------
Principal Amount:   ${formatCurrency(loan.amount)}
Interest Rate:      ${loan.interest_rate}%
Tenure:             ${loan.number_of_weeks} Weeks
Total Repaid:       ${formatCurrency(loan.total_collected)}
Net Profit Earned:  ${formatCurrency(loan.profit)}
Closure Date:       ${dateStr}
Status:             ${loan.closureStatus === 'on_time' ? 'CLOSED ON TIME' : 'FULLY SETTLED & CLOSED'}

======================================================================
This document certifies that the loan ${loanDisplay} has been fully
settled with zero balance outstanding.
Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
======================================================================
    `.trim()

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Loan_Closure_${loanDisplay}_${custName.replace(/\s+/g, '_')}.txt`
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    document.body.removeChild(a)

    showNotification(`Closure Statement downloaded for ${custName}!`, 'success')
  }

  // Cascade Delete Execution
  const handleExecuteDelete = async () => {
    if (!deletingLoan) return
    const custId = deletingLoan.customer?.id || deletingLoan.customer_id
    const custName = deletingLoan.customer?.name || 'Borrower'

    try {
      const res = await fetch(`/api/customers/${custId}/delete`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json?.error || 'Failed to delete customer.')
      }

      showNotification(`Customer ${custName} and records permanently deleted.`, 'success')
      setDeletingLoan(null)
      loadClosedLoans()
    } catch (err: any) {
      console.error('Delete error:', err)
      showNotification(err.message || 'Error executing delete.', 'error')
    }
  }

  // Renew Success Callback
  const handleRenewSuccess = (newLoan: any) => {
    setRenewingLoan(null)
    showNotification(
      `Loan renewal issued successfully! New Loan ID: ${getLoanDisplayId(newLoan)}`,
      'success'
    )
    loadClosedLoans()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
      {/* Lightbox for Customer Photos */}
      {lightboxPhoto && (
        <PhotoLightbox
          isOpen={!!lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
          photos={[{ url: lightboxPhoto.url, title: lightboxPhoto.title }]}
          alt={lightboxPhoto.title}
        />
      )}

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl transition-all animate-slide-down ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : notification.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-primary-600 text-white border-primary-500'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-white/80 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Closed Loans Management
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-black border border-emerald-200 shadow-xs">
              {loans.length} Settled
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Historical portfolio of fully settled accounts with instant renew, statement generation, and audits
          </p>
        </div>

        <button
          onClick={loadClosedLoans}
          disabled={loading}
          className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 shadow-sm transition-all inline-flex items-center gap-2 self-start sm:self-auto active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-600' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* SUMMARY STRIP & FILTERS */}
      <ClosedLoanSummaryStrip
        totalLoans={summaryMetrics.totalLoans}
        totalDisbursed={summaryMetrics.totalDisbursed}
        totalCollected={summaryMetrics.totalCollected}
        totalProfit={summaryMetrics.totalProfit}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedLeader={selectedLeader}
        onLeaderChange={setSelectedLeader}
        selectedBatch={selectedBatch}
        onBatchChange={setSelectedBatch}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        employees={employees}
      />

      {/* CLOSED LOANS TABLE (Desktop / Tablet) & CARDS (Mobile) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary-600 border-t-transparent" />
            <p className="text-xs font-bold text-slate-600">Loading closed accounts...</p>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="py-20 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">No Closed Loans Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm || selectedLeader !== 'all' || selectedBatch !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your search criteria or clear active filters.'
                : 'When an active loan is paid down to ₹0 remaining balance, it automatically settles here.'}
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP / TABLET TABLE VIEW (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider text-[11px]">
                    <th className="py-4 px-5">Borrower Profile</th>
                    <th className="py-4 px-4">Loan ID</th>
                    <th className="py-4 px-4">Disbursed On</th>
                    <th className="py-4 px-4">Capital Disbursed</th>
                    <th className="py-4 px-4">Total Recovered</th>
                    <th className="py-4 px-4">Profit Earned</th>
                    <th className="py-4 px-4">Team Leader</th>
                    <th className="py-4 px-4">Closed Date</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLoans.map((loan) => {
                    const custPhoto = loan.customer?.photo_url || loan.customer?.profile_photo

                    return (
                      <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Borrower Profile (Avatar 44px + Name) */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() =>
                                custPhoto &&
                                setLightboxPhoto({
                                  url: custPhoto,
                                  title: loan.customer?.name || 'Customer',
                                })
                              }
                              className={`w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center font-black text-xs flex-shrink-0 border shadow-xs ${
                                custPhoto
                                  ? 'cursor-pointer border-slate-200 hover:opacity-90'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {custPhoto ? (
                                <img
                                  src={custPhoto}
                                  alt={loan.customer?.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (loan.customer?.name || 'CU').slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <span className="font-black text-slate-900 text-sm block leading-tight">
                                {loan.customer?.name || loan.customer_name}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                                {loan.customer?.phone ? `${loan.customer.phone} · ` : ''}
                                ID: {loan.customer?.customer_id_display || loan.customer_id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Loan ID with Copy */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{getLoanDisplayId(loan)}</span>
                            <button
                              onClick={() => copyToClipboard(getLoanDisplayId(loan), loan.id)}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                              title="Copy Loan ID"
                            >
                              {copiedId === loan.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Disbursed On */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <DisbursementInfo loan={loan} variant="table-cell" />
                        </td>

                        {/* Capital Disbursed */}
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {formatCurrency(loan.amount)}
                        </td>

                        {/* Total Recovered */}
                        <td className="py-3.5 px-4 font-black text-emerald-600">
                          {formatCurrency(loan.total_collected)}
                        </td>

                        {/* Profit Earned */}
                        <td className="py-3.5 px-4 font-black text-indigo-900">
                          +{formatCurrency(loan.profit)}
                        </td>

                        {/* Team Leader & Batch */}
                        <td className="py-3.5 px-4 text-slate-700">
                          <span className="font-bold block text-slate-900">
                            {loan.team_leader?.name || loan.team_leader_name || 'N/A'}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold capitalize">
                            {loan.weekly_batch} batch
                          </span>
                        </td>

                        {/* Closed Date */}
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {formatDate(loan.closure_date)}
                        </td>

                        {/* Closure Status Chip */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              loan.closureStatus === 'on_time'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : loan.closureStatus === 'late'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {loan.closureStatus === 'on_time' && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            )}
                            {loan.closureStatus === 'late' && (
                              <Clock className="w-3 h-3 text-amber-600" />
                            )}
                            {loan.closureStatus === 'settled' && (
                              <Sparkles className="w-3 h-3 text-blue-600" />
                            )}
                            {loan.closureStatus === 'on_time'
                              ? 'On Time'
                              : loan.closureStatus === 'late'
                              ? 'Closed Late'
                              : 'Settled'}
                          </span>
                        </td>

                        {/* Actions Component */}
                        <td className="py-3.5 px-5 text-right">
                          <ClosedLoanActions
                            onView={() =>
                              setHistoryCustomer({
                                id: loan.customer?.id || loan.customer_id,
                                customer: loan.customer,
                              })
                            }
                            onRenew={() => setRenewingLoan(loan)}
                            onDownload={() => handleDownloadStatement(loan)}
                            onEdit={() => setEditingLoan(loan)}
                            onDelete={() => setDeletingLoan(loan)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD VIEW (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredLoans.map((loan) => {
                const custPhoto = loan.customer?.photo_url || loan.customer?.profile_photo

                return (
                  <div key={loan.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() =>
                            custPhoto &&
                            setLightboxPhoto({
                              url: custPhoto,
                              title: loan.customer?.name || 'Customer',
                            })
                          }
                          className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center font-black text-xs bg-slate-100 border border-slate-200"
                        >
                          {custPhoto ? (
                            <img
                              src={custPhoto}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (loan.customer?.name || 'CU').slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h5 className="font-black text-slate-900 text-sm">
                            {loan.customer?.name || loan.customer_name}
                          </h5>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {getLoanDisplayId(loan)}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          loan.closureStatus === 'on_time'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {loan.closureStatus === 'on_time' ? 'On Time' : 'Settled'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">
                          Disbursed
                        </span>
                        <strong className="font-black text-slate-900">
                          {formatCurrency(loan.amount)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block font-bold uppercase">
                          Recovered
                        </span>
                        <strong className="font-black text-emerald-600">
                          {formatCurrency(loan.total_collected)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-600 block font-bold uppercase">
                          Profit
                        </span>
                        <strong className="font-black text-indigo-900">
                          +{formatCurrency(loan.profit)}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-1">
                      <DisbursementInfo loan={loan} variant="compact" />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        Closed on {formatDate(loan.closure_date)}
                      </span>
                      <ClosedLoanActions
                        onView={() =>
                          setHistoryCustomer({
                            id: loan.customer?.id || loan.customer_id,
                            customer: loan.customer,
                          })
                        }
                        onRenew={() => setRenewingLoan(loan)}
                        onDownload={() => handleDownloadStatement(loan)}
                        onEdit={() => setEditingLoan(loan)}
                        onDelete={() => setDeletingLoan(loan)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* --- RENEW LOAN MODAL --- */}
      {renewingLoan && (
        <RenewLoanModal
          closedLoan={renewingLoan}
          employees={employees}
          onClose={() => setRenewingLoan(null)}
          onSuccess={handleRenewSuccess}
          onAbort={() => {
            setRenewingLoan(null)
            showNotification(`Renewal cancelled. The original closed loan remains unchanged.`, 'info')
          }}
        />
      )}

      {/* --- CUSTOMER LOAN HISTORY MODAL --- */}
      {historyCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[75] p-4">
          <div className="max-w-4xl w-full">
            <CustomerLoanHistory
              customerId={historyCustomer.id}
              customer={historyCustomer.customer}
              onClose={() => setHistoryCustomer(null)}
              showRenewAction={true}
              onRenewLoan={(loanToRenew) => {
                setHistoryCustomer(null)
                setRenewingLoan(loanToRenew)
              }}
            />
          </div>
        </div>
      )}

      {/* --- EDIT LOAN FORM MODAL --- */}
      {editingLoan && (
        <EditLoanForm
          loan={editingLoan}
          employees={employees}
          isOpen={!!editingLoan}
          onClose={() => setEditingLoan(null)}
          onSaveSuccess={() => {
            showNotification('Closed loan record updated successfully!', 'success')
            setEditingLoan(null)
            loadClosedLoans()
          }}
        />
      )}

      {/* --- CONFIRM PERMANENT DELETE MODAL --- */}
      {deletingLoan && (
        <ConfirmDeleteModal
          isOpen={!!deletingLoan}
          customerName={deletingLoan.customer?.name || deletingLoan.customer_name || 'Borrower'}
          customerId={deletingLoan.customer?.id || deletingLoan.customer_id}
          onClose={() => setDeletingLoan(null)}
          onConfirm={handleExecuteDelete}
        />
      )}
    </div>
  )
}
