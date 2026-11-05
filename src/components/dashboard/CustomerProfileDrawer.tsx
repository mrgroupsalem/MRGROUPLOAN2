'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  X,
  Phone,
  MessageSquare,
  Calendar,
  Wallet,
  TrendingUp,
  FileText,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit,
  DollarSign,
  Maximize2,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  User,
  Search,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Customer, Loan, Collection, Employee } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { calculateEMI, calculateTotalPayable } from '@/hooks/usePendingCollections'
import PhotoLightbox from '@/components/ui/PhotoLightbox'
import { formatDueDate, formatLongDate, getLoanEndDate } from '@/lib/dueSchedule'
import { useCustomerFullProfile } from '@/hooks/useCustomerFullProfile'
import { getPendingDues, DueBreakdownItem } from '@/lib/pendingBreakdown'
import PendingDueList from './PendingDueList'
import DueScheduleTable from './DueScheduleTable'
import DocumentsDetailsTab from './DocumentsDetailsTab'

export interface CustomerProfileDrawerProps {
  customerId?: string | null
  initialLoanId?: string | null
  // Optional backwards-compatibility props
  customer?: Customer | null
  loan?: Loan | null
  allLoans?: Loan[]
  collections?: Collection[]
  isOpen: boolean
  onClose: () => void
  onCollect?: (loan: Loan) => void
  onEdit?: (loan: Loan) => void
}

type TabType = 'overview' | 'loans' | 'pending' | 'payments' | 'documents'

export default function CustomerProfileDrawer({
  customerId,
  initialLoanId,
  customer: propCustomer,
  loan: propLoan,
  allLoans: propAllLoans,
  collections: propCollections,
  isOpen,
  onClose,
  onCollect,
  onEdit,
}: CustomerProfileDrawerProps) {
  // Dev-only warning if opened with full object instead of ID
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && propCustomer && !customerId) {
      console.warn(
        '[CustomerProfileDrawer] Warning: CustomerProfileDrawer should receive customerId (string) instead of full object for single-source-of-truth fetching.'
      )
    }
  }, [propCustomer, customerId])

  // Resolve ID to query
  const targetId = customerId || propCustomer?.id || propCustomer?.customer_id_display || propLoan?.customer_id || null
  const targetLoanId = initialLoanId || propLoan?.id || null

  // ONE Source of Truth: fetch everything via useCustomerFullProfile
  const {
    customer: fetchedCustomer,
    loans: fetchedLoans,
    activeLoan: fetchedActiveLoan,
    collections: fetchedCollections,
    employees,
    isLoading,
    isError,
    error,
    refetch,
  } = useCustomerFullProfile(isOpen ? targetId : null, targetLoanId)

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null)
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false)

  // Filters inside "Pending Dues" tab
  const [pendingFilter, setPendingFilter] = useState<'all' | 'due_today' | 'overdue' | 'upcoming'>('all')
  const [pendingSearch, setPendingSearch] = useState('')

  // Reset selectedLoanId and tab when drawer re-opens or customer changes
  useEffect(() => {
    if (isOpen) {
      setSelectedLoanId(targetLoanId || null)
    }
  }, [isOpen, targetLoanId, targetId])

  // Fallback to prop values if hook has not finished or for offline testing
  const customer = fetchedCustomer || propCustomer || null
  const customerLoans = fetchedLoans.length > 0 ? fetchedLoans : (propAllLoans || []).filter((l) => l.customer_id === customer?.id)
  const collections = fetchedCollections.length > 0 ? fetchedCollections : (propCollections || [])

  // Currently selected loan
  const currentLoan = useMemo(() => {
    if (selectedLoanId) {
      const match = customerLoans.find((l) => l.id === selectedLoanId)
      if (match) return match
    }
    if (fetchedActiveLoan) return fetchedActiveLoan
    if (propLoan) return propLoan
    return customerLoans.find((l) => l.status === 'active') || customerLoans[0] || null
  }, [selectedLoanId, customerLoans, fetchedActiveLoan, propLoan])

  // Customer collections filtered
  const customerCollections = useMemo(() => {
    if (!customer) return []
    const loanIds = new Set(customerLoans.map((l) => l.id))
    return collections
      .filter((c) => c.customer_id === customer.id || loanIds.has(c.loan_id))
      .sort((a, b) => new Date(b.collection_date).getTime() - new Date(a.collection_date).getTime())
  }, [customer, customerLoans, collections])

  // Pending breakdown for current loan (Single Source of Truth)
  const pendingBreakdown = useMemo(() => {
    if (!currentLoan) return []
    return getPendingDues(currentLoan, collections)
  }, [currentLoan, collections])

  const pendingDuesTotal = useMemo(() => {
    return pendingBreakdown.reduce((sum, b) => sum + b.pending, 0)
  }, [pendingBreakdown])

  // Filtered pending items for "Pending Dues" tab
  const filteredPendingItems = useMemo(() => {
    let items = pendingBreakdown

    if (pendingFilter === 'due_today') {
      items = items.filter((b) => b.status === 'due_today')
    } else if (pendingFilter === 'overdue') {
      items = items.filter((b) => b.status === 'overdue')
    }

    if (pendingSearch.trim()) {
      const q = pendingSearch.toLowerCase().trim()
      items = items.filter(
        (b) =>
          b.dueDate.toLowerCase().includes(q) ||
          b.formattedDate.toLowerCase().includes(q) ||
          b.weekLabel.toLowerCase().includes(q)
      )
    }

    return items
  }, [pendingBreakdown, pendingFilter, pendingSearch])

  // Lifetime summaries
  const lifetimeStats = useMemo(() => {
    let totalBorrowed = 0
    let totalPaid = 0
    let totalOutstanding = 0

    customerLoans.forEach((l) => {
      totalBorrowed += Number(l.amount) || 0
      const totalPayable = calculateTotalPayable(l)
      const loanPaid = collections
        .filter((c) => c.loan_id === l.id)
        .reduce((sum, c) => sum + (Number(c.amount_collected) || 0), 0)

      totalPaid += loanPaid
      if (l.status === 'active') {
        totalOutstanding += Math.max(0, totalPayable - loanPaid)
      }
    })

    // On-time payment calculation
    const totalPayments = customerCollections.length
    const onTimePayments = customerCollections.filter(
      (c) => (c.status || '').toLowerCase() === 'completed'
    ).length
    const onTimeRate = totalPayments > 0 ? Math.round((onTimePayments / totalPayments) * 100) : 100

    let riskBadge: { label: string; tone: string } = {
      label: 'Good Borrower',
      tone: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    }
    if (onTimeRate < 60) {
      riskBadge = {
        label: 'Risky Borrower',
        tone: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
      }
    } else if (onTimeRate < 85) {
      riskBadge = {
        label: 'Average Borrower',
        tone: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      }
    }

    return {
      totalBorrowed,
      totalPaid,
      totalOutstanding,
      onTimeRate,
      riskBadge,
      totalLoansCount: customerLoans.length,
    }
  }, [customerLoans, collections, customerCollections])

  if (!isOpen) return null

  const customerPhoto = customer?.photo_url || (customer as any)?.profile_photo || currentLoan?.photo_url || null
  const initials = customer?.name
    ? customer.name
        .trim()
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'CU'

  const displayId =
    customer?.customer_id_display ||
    currentLoan?.loan_id_display ||
    (customer?.id ? customer.id.slice(0, 8).toUpperCase() : 'N/A')

  const memberSinceStr = customer?.created_at
    ? new Date(customer.created_at).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A'

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      {/* Lightbox for zooming customer avatar */}
      <PhotoLightbox
        isOpen={isPhotoZoomed}
        photos={
          customerPhoto
            ? [
                {
                  url: customerPhoto,
                  title: customer?.name || 'Customer',
                  subtitle: `Customer ID: ${displayId}`,
                },
              ]
            : []
        }
        onClose={() => setIsPhotoZoomed(false)}
      />

      <div
        className="w-full md:max-w-xl lg:max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in-right border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* TASK 1: RESTORED DARK BLUE HEADER (Image 2 style with spring animations)  */}
        {/* ========================================================================= */}
        <div className="p-6 bg-gradient-to-r from-[#0f0c29] via-[#1e1b4b] to-[#24243e] text-white flex-shrink-0 relative overflow-hidden shadow-lg border-b border-white/10 animate-fade-in">
          {/* Subtle background glow effect */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              {/* Rounded Square Photo with Click to Zoom */}
              <div
                onClick={() => customerPhoto && setIsPhotoZoomed(true)}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-black text-xl shadow-xl ring-2 ring-white/20 overflow-hidden flex-shrink-0 transition-transform duration-300 hover:scale-105 ${
                  customerPhoto
                    ? 'cursor-pointer hover:ring-primary-400'
                    : 'bg-gradient-to-tr from-primary-600 to-indigo-600 text-white'
                }`}
                title={customerPhoto ? 'Click to Zoom Photo' : ''}
              >
                {customerPhoto ? (
                  <>
                    <img
                      src={customerPhoto}
                      alt={customer?.name || 'Customer'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/25 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  </>
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {/* Name, Badges & Metadata */}
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                    {customer?.name || (isLoading ? 'Loading profile...' : 'Customer')}
                  </h2>
                  {lifetimeStats.riskBadge && (
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${lifetimeStats.riskBadge.tone}`}
                    >
                      {lifetimeStats.riskBadge.label}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-indigo-200/90 font-mono">
                  <span>ID: {displayId}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-[11px] text-slate-300/80 font-sans">
                    Member since {memberSinceStr}
                  </span>
                </div>
              </div>
            </div>

            {/* Top-Right Refresh & Close (X) Buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => refetch()}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                title="Refresh Customer Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-300' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                title="Close Profile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Contact & Action Pills on Dark Header */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 flex-wrap">
            {customer?.phone && (
              <>
                <a
                  href={`tel:${customer.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold backdrop-blur-xs transition-colors"
                  title="Call Customer"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Call {customer.phone}</span>
                </a>
                <a
                  href={`https://wa.me/91${customer.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-colors"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </>
            )}

            {currentLoan && onEdit && (
              <button
                onClick={() => {
                  onEdit(currentLoan)
                  onClose()
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold ml-auto transition-colors"
                title="Edit Customer Profile"
              >
                <Edit className="w-3.5 h-3.5 text-indigo-300" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TABS NAVIGATION (TASK 2: PENDING DUES AS ITS OWN HEADING BEFORE PAYMENTS) */}
        {/* ========================================================================= */}
        <div className="flex items-center border-b border-slate-200 px-6 bg-slate-50/60 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'loans'
                ? 'border-primary-600 text-primary-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Loan History ({customerLoans.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'border-rose-600 text-rose-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Pending Dues</span>
            {pendingBreakdown.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 animate-pulse">
                {pendingBreakdown.length}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">(0)</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-primary-600 text-primary-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Payments ({customerCollections.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'documents'
                ? 'border-primary-600 text-primary-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Documents & Details
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB CONTENT BODY                                                          */}
        {/* ========================================================================= */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* LOADING SKELETON */}
          {isLoading && !customer && (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
                ))}
              </div>
              <div className="h-48 bg-slate-100 rounded-2xl" />
              <div className="h-32 bg-slate-100 rounded-2xl" />
            </div>
          )}

          {/* ERROR STATE */}
          {isError && (
            <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Failed to load customer profile
              </div>
              <p className="text-xs text-rose-700">
                {error?.message || 'A network error occurred while querying Supabase.'}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-1 px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 1: OVERVIEW (Compact summary card only, no long 15-dues list)     */}
          {/* ===================================================================== */}
          {activeTab === 'overview' && customer && (
            <div className="space-y-6">
              {/* Financial Snapshot Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Lifetime Borrowed
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-900 mt-0.5 block">
                    {formatCurrency(lifetimeStats.totalBorrowed)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    Total Paid
                  </span>
                  <span className="text-sm sm:text-base font-black text-emerald-700 mt-0.5 block">
                    {formatCurrency(lifetimeStats.totalPaid)}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                    Outstanding
                  </span>
                  <span className="text-sm sm:text-base font-black text-rose-700 mt-0.5 block">
                    {formatCurrency(lifetimeStats.totalOutstanding)}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                    On-Time %
                  </span>
                  <span className="text-sm sm:text-base font-black text-indigo-700 mt-0.5 block">
                    {lifetimeStats.onTimeRate}%
                  </span>
                </div>
              </div>

              {/* COMPACT PENDING DUES SUMMARY CARD (Switches to "Pending Dues" tab) */}
              {currentLoan && pendingBreakdown.length > 0 ? (
                <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 flex-shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Pending Dues: {pendingBreakdown.length} due{pendingBreakdown.length !== 1 ? 's' : ''} ·{' '}
                        <strong className="text-rose-700 font-mono font-black">
                          {formatCurrency(pendingDuesTotal)}
                        </strong>
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {pendingBreakdown.filter((b) => b.status === 'overdue').length > 0
                          ? `${pendingBreakdown.filter((b) => b.status === 'overdue').length} overdue week(s) requiring collection`
                          : 'All current cycle weekly dues'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-white hover:bg-rose-100 border border-rose-300 transition-colors w-full sm:w-auto justify-center shadow-2xs"
                  >
                    <span>View all pending dues</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between text-xs text-emerald-800 font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>All weekly dues up to date. No pending balance!</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    View schedule →
                  </button>
                </div>
              )}

              {/* Current Active Loan Card */}
              {currentLoan ? (
                <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-900">Current Active Loan</span>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {currentLoan.loan_id_display || currentLoan.id.slice(0, 8)} · {currentLoan.weekly_batch} Batch
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      {currentLoan.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium">Sanctioned Principal</span>
                      <strong className="text-slate-900 font-extrabold text-sm">{formatCurrency(currentLoan.amount)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium">Weekly EMI</span>
                      <strong className="text-slate-900 font-extrabold text-sm">{formatCurrency(calculateEMI(currentLoan))}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium">Tenure</span>
                      <strong className="text-slate-900 font-extrabold text-sm">{currentLoan.number_of_weeks || 15} Weeks</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium">Total Payable</span>
                      <strong className="text-slate-900 font-extrabold text-sm">{formatCurrency(calculateTotalPayable(currentLoan))}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium">Team Leader</span>
                      <strong className="text-slate-900 font-extrabold text-sm">{currentLoan.team_leader?.name || 'Unassigned'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium">Weekly Batch</span>
                      <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">
                        {currentLoan.weekly_batch || 'Tuesday'} Batch
                      </span>
                    </div>

                    {/* Row 3: Start Date and End Date side-by-side */}
                    <div className="transition-all duration-300">
                      <span className="text-slate-400 block text-[11px] font-medium">Start Date</span>
                      <strong className="text-slate-900 font-extrabold text-xs sm:text-sm block mt-0.5">
                        {formatLongDate(currentLoan.start_date || currentLoan.created_at)}
                      </strong>
                    </div>
                    <div className="transition-all duration-300 bg-slate-50/80 p-2 rounded-xl border border-slate-200/60">
                      <span className="text-slate-500 block text-[11px] font-bold">End Date</span>
                      <strong className="text-slate-900 font-extrabold text-xs sm:text-sm block mt-0.5">
                        {formatLongDate(getLoanEndDate(currentLoan))}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium">Loan Status</span>
                      <span
                        className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          currentLoan.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {currentLoan.status}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border">
                  No active loan currently open for this customer.
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 2: LOAN HISTORY                                                   */}
          {/* ===================================================================== */}
          {activeTab === 'loans' && (
            <div className="space-y-3">
              {customerLoans.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No loan records registered yet.</div>
              ) : (
                customerLoans.map((l, idx) => {
                  const isCurrent = l.id === currentLoan?.id
                  const loanPaid = collections
                    .filter((c) => c.loan_id === l.id)
                    .reduce((sum, c) => sum + (Number(c.amount_collected) || 0), 0)
                  const loanPayable = calculateTotalPayable(l)
                  const loanPending = Math.max(0, loanPayable - loanPaid)

                  return (
                    <div
                      key={l.id}
                      onClick={() => setSelectedLoanId(l.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-primary-500 bg-primary-50/20 shadow-xs ring-1 ring-primary-500/30'
                          : 'border-slate-200 bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {l.loan_id_display || `LN-${idx + 1}`}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              l.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {l.status}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-800">
                              Selected View
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-black text-slate-900 font-mono">
                          {formatCurrency(l.amount)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Weekly EMI</span>
                          <strong className="text-slate-800 font-mono">{formatCurrency(calculateEMI(l))}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Start Date</span>
                          <span className="text-slate-700 font-medium">
                            {formatLongDate(l.start_date || l.created_at)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">End Date</span>
                          <span className="text-slate-700 font-medium">{formatLongDate(getLoanEndDate(l))}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Pending</span>
                          <strong className={`font-mono ${loanPending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCurrency(loanPending)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 3: PENDING DUES (DEDICATED FULL TAB WITH STICKY BAR & FILTERS)     */}
          {/* ===================================================================== */}
          {activeTab === 'pending' && currentLoan && (
            <div className="space-y-4">
              {/* Sticky Summary Bar */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Pending Due Schedule</h4>
                      <p className="text-[11px] text-slate-400">
                        {currentLoan.loan_id_display || 'Loan'} · {currentLoan.weekly_batch || 'Tuesday'} Batch
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                      Total Uncollected
                    </span>
                    <span className="text-lg font-black font-mono text-rose-400">
                      {formatCurrency(pendingDuesTotal)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Pending Dues</span>
                    <strong className="text-white font-bold">{pendingBreakdown.length} Weeks</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Weekly EMI</span>
                    <strong className="text-white font-mono">{formatCurrency(calculateEMI(currentLoan))}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Oldest Unpaid</span>
                    <strong className="text-slate-200">
                      {pendingBreakdown[0]?.formattedDate || 'None'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Overdue Count</span>
                    <strong className="text-amber-300">
                      {pendingBreakdown.filter((b) => b.status === 'overdue').length} Weeks
                    </strong>
                  </div>
                </div>
              </div>

              {/* Filters & Search Control */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pendingSearch}
                    onChange={(e) => setPendingSearch(e.target.value)}
                    placeholder="Search by date, week..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 text-xs">
                  <button
                    onClick={() => setPendingFilter('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                      pendingFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All ({pendingBreakdown.length})
                  </button>
                  <button
                    onClick={() => setPendingFilter('due_today')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                      pendingFilter === 'due_today'
                        ? 'bg-orange-500 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-orange-700'
                    }`}
                  >
                    Due Today ({pendingBreakdown.filter((b) => b.status === 'due_today').length})
                  </button>
                  <button
                    onClick={() => setPendingFilter('overdue')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                      pendingFilter === 'overdue'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-rose-700'
                    }`}
                  >
                    Overdue ({pendingBreakdown.filter((b) => b.status === 'overdue').length})
                  </button>
                </div>
              </div>

              {/* Full Date-Wise Pending List */}
              {filteredPendingItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  {pendingBreakdown.length === 0 ? (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">No pending dues</p>
                      <p className="text-slate-500">All payments are up to date! Future installments will appear when their due date arrives.</p>
                    </div>
                  ) : (
                    `No pending dues match filter "${pendingFilter}".`
                  )}
                </div>
              ) : (
                <PendingDueList items={filteredPendingItems} selectable={false} />
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 4: PAYMENTS (FULL DUE SCHEDULE WITH PENDING COLUMN)               */}
          {/* ===================================================================== */}
          {activeTab === 'payments' && currentLoan && (
            <DueScheduleTable loan={currentLoan} collections={collections} employees={employees} />
          )}

          {/* ===================================================================== */}
          {/* TAB 5: DOCUMENTS & DETAILS (CUSTOMER PHOTO + TEXT FIELDS)             */}
          {/* ===================================================================== */}
          {activeTab === 'documents' && customer && (
            <DocumentsDetailsTab
              customer={customer}
              loan={currentLoan}
              employees={employees}
              isAdmin={true}
              onEditSection={() => {
                if (onEdit && currentLoan) onEdit(currentLoan)
              }}
            />
          )}
        </div>

        {/* ========================================================================= */}
        {/* DRAWER FOOTER (IDENTICAL ACTIONS FROM ALL ENTRY POINTS)                   */}
        {/* ========================================================================= */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500 w-full sm:w-auto text-center sm:text-left">
            Borrower: <strong className="text-slate-800">{customer?.name}</strong> · ID:{' '}
            <span className="font-mono text-slate-700">{displayId}</span>
          </div>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            {/* Collect Payment Button */}
            {currentLoan && onCollect && (
              <button
                onClick={() => {
                  onCollect(currentLoan)
                  onClose()
                }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                title="Record Payment for Customer"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Collect Payment</span>
              </button>
            )}

            {/* Edit Loan & Customer Button */}
            {currentLoan && onEdit && (
              <button
                onClick={() => {
                  onEdit(currentLoan)
                  onClose()
                }}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                title="Edit Customer & Loan"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
