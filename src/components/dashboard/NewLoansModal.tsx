'use client'

import { useState, useMemo } from 'react'
import { X, Search, Calendar, User, Phone, ArrowUpRight, CheckCircle, RefreshCw } from 'lucide-react'
import { TodayLoanItem } from '@/hooks/useDashboardData'
import { formatCurrency } from '@/lib/utils'
import CustomerNameLink from '@/components/ui/CustomerNameLink'

interface NewLoansModalProps {
  isOpen: boolean
  onClose: () => void
  loans: TodayLoanItem[]
  allLoans: any[]
  onViewCustomer?: (customerId: string) => void
}

export default function NewLoansModal({
  isOpen,
  onClose,
  loans,
  allLoans,
  onViewCustomer,
}: NewLoansModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  )
  const [searchTerm, setSearchTerm] = useState('')

  // Filter loans for selected date and search keyword
  const filteredLoans = useMemo(() => {
    // If selected date is today, use `loans`. Otherwise query from allLoans.
    const isToday =
      selectedDate === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    let list: TodayLoanItem[] = []

    if (isToday) {
      list = loans
    } else {
      // Extract from allLoans for the selectedDate
      allLoans.forEach((loan) => {
        const createdDate = new Date(loan.created_at).toLocaleDateString('en-CA', {
          timeZone: 'Asia/Kolkata',
        })
        if (createdDate === selectedDate) {
          const timeStr = new Date(loan.created_at).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
          })
          list.push({
            id: loan.id,
            loanIdDisplay: loan.loan_id_display,
            customerId: loan.customer_id,
            customerName: loan.customer?.name || 'Customer',
            customerPhone: loan.customer?.phone || '',
            amount: Number(loan.amount) || 0,
            type: 'New', // Default fallback
            teamLeaderName: loan.team_leader?.name || 'Unassigned',
            batchDay: loan.weekly_batch || 'tuesday',
            createdAt: loan.created_at,
            formattedTime: timeStr,
          })
        }
      })
    }

    if (!searchTerm.trim()) return list

    const q = searchTerm.toLowerCase()
    return list.filter(
      (l) =>
        l.customerName.toLowerCase().includes(q) ||
        l.customerPhone.includes(q) ||
        (l.loanIdDisplay && l.loanIdDisplay.toLowerCase().includes(q))
    )
  }, [selectedDate, loans, allLoans, searchTerm])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">New Loans</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review all customer loans originated on selected date
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, loan ID..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700 font-medium"
            />
          </div>
        </div>

        {/* Loans List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {filteredLoans.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No new loans recorded for this date or matching query.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 p-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {loan.type === 'Renewal' ? 'REN' : 'NEW'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CustomerNameLink
                          customerId={loan.customerId}
                          name={loan.customerName}
                          className="text-sm font-bold text-slate-900"
                        />
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            loan.type === 'Renewal'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {loan.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        {loan.customerPhone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {loan.customerPhone}
                          </span>
                        )}
                        <span>Leader: {loan.teamLeaderName}</span>
                        <span className="capitalize">Batch: {loan.batchDay}</span>
                        <span>{loan.formattedTime}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
                        <span>Start: <strong className="text-slate-700">{allLoans.find((l) => l.id === loan.id)?.start_date || '—'}</strong></span>
                        <span>•</span>
                        <span>End: <strong className="text-slate-700">{allLoans.find((l) => l.id === loan.id)?.end_date || '—'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Sanctioned Amount</span>
                      <span className="text-base font-extrabold text-slate-900">
                        {formatCurrency(loan.amount)}
                      </span>
                    </div>

                    {onViewCustomer && (
                      <button
                        onClick={() => {
                          onViewCustomer(loan.customerId)
                          onClose()
                        }}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-300 transition-colors"
                        title="View Customer"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>Total Loans: {filteredLoans.length}</span>
          <span>
            Total Amount:{' '}
            <strong className="text-slate-800">
              {formatCurrency(filteredLoans.reduce((sum, l) => sum + l.amount, 0))}
            </strong>
          </span>
        </div>
      </div>
    </div>
  )
}

