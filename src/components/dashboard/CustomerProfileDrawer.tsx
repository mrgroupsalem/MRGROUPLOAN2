'use client'

import { useState, useMemo } from 'react'
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
} from 'lucide-react'
import { Customer, Loan, Collection } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { calculateEMI, calculateTotalPayable } from '@/hooks/usePendingCollections'
import PhotoLightbox from '@/components/ui/PhotoLightbox'
import DisbursementInfo from '@/components/ui/DisbursementInfo'
import { formatDisbursementDate, formatDueDate, getFirstDueDate } from '@/lib/dueSchedule'

interface CustomerProfileDrawerProps {
  customer: Customer | null
  loan?: Loan | null
  allLoans: Loan[]
  collections: Collection[]
  isOpen: boolean
  onClose: () => void
  onCollect?: (loan: Loan) => void
  onEdit?: (loan: Loan) => void
}

export default function CustomerProfileDrawer({
  customer,
  loan,
  allLoans,
  collections,
  isOpen,
  onClose,
  onCollect,
  onEdit,
}: CustomerProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'loans' | 'payments' | 'documents'>('overview')
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false)

  // Associated loans for this customer
  const customerLoans = useMemo(() => {
    if (!customer) return []
    return allLoans.filter((l) => l.customer_id === customer.id)
  }, [customer, allLoans])

  // Active loan
  const currentLoan = useMemo(() => {
    if (loan) return loan
    return customerLoans.find((l) => l.status === 'active') || customerLoans[0] || null
  }, [loan, customerLoans])

  // Payment timeline across all loans or current loan
  const customerCollections = useMemo(() => {
    if (!customer) return []
    const loanIds = new Set(customerLoans.map((l) => l.id))
    return collections
      .filter((c) => c.customer_id === customer.id || loanIds.has(c.loan_id))
      .sort((a, b) => new Date(b.collection_date).getTime() - new Date(a.collection_date).getTime())
  }, [customer, customerLoans, collections])

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

    // Risk badge
    let riskBadge: { label: string; tone: string } = { label: 'Good', tone: 'bg-emerald-100 text-emerald-800' }
    if (onTimeRate < 60) {
      riskBadge = { label: 'Risky', tone: 'bg-rose-100 text-rose-800' }
    } else if (onTimeRate < 85) {
      riskBadge = { label: 'Average', tone: 'bg-amber-100 text-amber-800' }
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

  if (!isOpen || !customer) return null

  const customerPhoto = (customer as any).profile_photo || (customer as any).photo_url || null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm animate-fade-in flex justify-end">
      {/* Full Screen Photo Lightbox (React Portal to document.body, in front of drawer) */}
      {customerPhoto && (
        <PhotoLightbox
          isOpen={isPhotoZoomed}
          onClose={() => setIsPhotoZoomed(false)}
          photos={[
            {
              url: customerPhoto,
              title: customer.name,
              subtitle: `Customer ID: ${customer.customer_id_display || customer.id.slice(0, 8)}`,
            },
          ]}
          alt={customer.name}
        />
      )}

      {/* Main Drawer Container: Slide from right on Desktop, Bottom sheet on Mobile */}
      <div
        className="w-full md:max-w-xl lg:max-w-2xl h-full bg-white shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar with Click to Zoom */}
              <div
                onClick={() => customerPhoto && setIsPhotoZoomed(true)}
                className={`relative w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ring-2 ring-white/20 overflow-hidden flex-shrink-0 ${
                  customerPhoto ? 'cursor-pointer hover:opacity-90' : 'bg-gradient-to-tr from-primary-600 to-indigo-600 text-white'
                }`}
              >
                {customerPhoto ? (
                  <>
                    <img src={customerPhoto} alt={customer.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/25 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Maximize2 className="w-4 h-4 text-white" />
                    </div>
                  </>
                ) : (
                  customer.name.slice(0, 2).toUpperCase()
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black">{customer.name}</h2>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${lifetimeStats.riskBadge.tone}`}>
                    {lifetimeStats.riskBadge.label} Borrower
                  </span>
                </div>
                <p className="text-xs text-indigo-200 font-mono mt-0.5">
                  ID: {customer.customer_id_display || customer.id.slice(0, 8)}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Member since {customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-IN') : 'N/A'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Contact Buttons */}
          <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-white/10">
            {customer.phone && (
              <>
                <a
                  href={`tel:${customer.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Call {customer.phone}</span>
                </a>
                <a
                  href={`https://wa.me/91${customer.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </>
            )}
            {currentLoan && onEdit && (
              <button
                onClick={() => onEdit(currentLoan)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold ml-auto transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 px-6 bg-slate-50 flex-shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'loans'
                ? 'border-primary-600 text-primary-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Loan History ({customerLoans.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'payments'
                ? 'border-primary-600 text-primary-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Payments ({customerCollections.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'documents'
                ? 'border-primary-600 text-primary-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Documents
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial Snapshot Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lifetime Borrowed</span>
                  <span className="text-sm sm:text-base font-black text-slate-900 mt-0.5 block">{formatCurrency(lifetimeStats.totalBorrowed)}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Paid</span>
                  <span className="text-sm sm:text-base font-black text-emerald-700 mt-0.5 block">{formatCurrency(lifetimeStats.totalPaid)}</span>
                </div>
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Outstanding</span>
                  <span className="text-sm sm:text-base font-black text-rose-700 mt-0.5 block">{formatCurrency(lifetimeStats.totalOutstanding)}</span>
                </div>
                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">On-Time %</span>
                  <span className="text-sm sm:text-base font-black text-indigo-700 mt-0.5 block">{lifetimeStats.onTimeRate}%</span>
                </div>
              </div>

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
                      <span className="text-slate-400 block text-[11px]">Sanctioned Principal</span>
                      <strong className="text-slate-900">{formatCurrency(currentLoan.amount)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Weekly EMI</span>
                      <strong className="text-slate-900">{formatCurrency(calculateEMI(currentLoan))}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Tenure</span>
                      <strong className="text-slate-900">{currentLoan.number_of_weeks || 15} Weeks</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Total Payable</span>
                      <strong className="text-slate-900">{formatCurrency(calculateTotalPayable(currentLoan))}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Team Leader</span>
                      <strong className="text-slate-900">{currentLoan.team_leader?.name || 'Unassigned'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Start Date</span>
                      <strong className="text-slate-900">{currentLoan.start_date || currentLoan.created_at.split('T')[0]}</strong>
                    </div>
                  </div>

                  {/* Disbursement and Schedule Details */}
                  <div className="pt-2 border-t border-slate-100">
                    <DisbursementInfo loan={currentLoan} variant="full" />
                  </div>
                </div>
              ) : (
                <div className="p-5 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border">
                  No active loan currently open for this customer.
                </div>
              )}

              {/* Personal Details */}
              <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Borrower Profile & Identity</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Primary Phone</span>
                    <strong className="text-slate-900 font-mono">{customer.phone || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Aadhaar Number</span>
                    <strong className="text-slate-900 font-mono">{(customer as any).aadhaar_number || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">PAN Number</span>
                    <strong className="text-slate-900 font-mono">{(customer as any).pan_number || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Relationship</span>
                    <strong className="text-slate-900">{customer.relationship || 'Self'}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">Residential Address</span>
                    <strong className="text-slate-900">{customer.address || 'Address not registered'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOANS HISTORY */}
          {activeTab === 'loans' && (
            <div className="space-y-3">
              {customerLoans.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No loan records found.</div>
              ) : (
                customerLoans.map((l, idx) => (
                  <div key={l.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                          #{customerLoans.length - idx}
                        </span>
                        <strong className="text-xs text-slate-900 font-mono">
                          {l.loan_id_display || l.id.slice(0, 8)}
                        </strong>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        l.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {l.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Amount</span>
                        <strong className="text-slate-900">{formatCurrency(l.amount)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Weekly EMI</span>
                        <strong className="text-slate-900">{formatCurrency(calculateEMI(l))}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Date Originated</span>
                        <span className="text-slate-600">{l.created_at ? l.created_at.split('T')[0] : 'N/A'}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <DisbursementInfo loan={l} variant="compact" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PAYMENT COLLECTIONS */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              {currentLoan && (
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                    <span>
                      Disbursed on <strong>{formatDisbursementDate(currentLoan.disbursement_date)}</strong>
                      {currentLoan.disbursement_date && (
                        <>
                          {' · '}First due <strong>{formatDueDate(getFirstDueDate(currentLoan.disbursement_date, currentLoan.weekly_batch || 'tuesday'))}</strong>
                        </>
                      )}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    {currentLoan.weekly_batch || 'Tuesday'} Batch
                  </span>
                </div>
              )}

              {customerCollections.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No payment collections logged yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {customerCollections.map((c) => (
                    <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">EMI Payment Received</p>
                          <p className="text-[11px] text-slate-400">
                            {c.collection_date || c.created_at} · Mode: Cash / UPI
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-emerald-600 text-sm">+{formatCurrency(c.amount_collected)}</p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Bal: {formatCurrency(c.remaining_balance)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                <span className="text-xs font-bold text-slate-800 block mb-2">Registered ID Proofs</span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-600 font-medium">Aadhaar Card</span>
                    <strong className="font-mono">{(customer as any).aadhaar_number || 'Not uploaded'}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-600 font-medium">PAN Card</span>
                    <strong className="font-mono">{(customer as any).pan_number || 'Not uploaded'}</strong>
                  </div>
                </div>
              </div>

              {customerPhoto && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                  <span className="text-xs font-bold text-slate-800 block mb-2">Profile Photo</span>
                  <img
                    src={customerPhoto}
                    alt={customer.name}
                    className="w-32 h-32 rounded-xl object-cover border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setIsPhotoZoomed(true)}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Click image to expand</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {currentLoan && onCollect && (
              <button
                onClick={() => {
                  onCollect(currentLoan)
                  onClose()
                }}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Collect Payment</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

