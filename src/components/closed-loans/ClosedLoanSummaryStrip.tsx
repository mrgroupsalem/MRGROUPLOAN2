'use client'

import { formatCurrency } from '@/lib/utils'
import { Employee } from '@/types'
import {
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  DollarSign,
  Calendar,
  X,
  Wallet,
} from 'lucide-react'

interface ClosedLoanSummaryStripProps {
  totalLoans: number
  totalDisbursed: number
  totalCollected: number
  totalProfit: number
  searchTerm: string
  onSearchChange: (val: string) => void
  selectedLeader: string
  onLeaderChange: (val: string) => void
  selectedBatch: string
  onBatchChange: (val: string) => void
  selectedStatus: string
  onStatusChange: (val: string) => void
  employees: Employee[]
}

export default function ClosedLoanSummaryStrip({
  totalLoans,
  totalDisbursed,
  totalCollected,
  totalProfit,
  searchTerm,
  onSearchChange,
  selectedLeader,
  onLeaderChange,
  selectedBatch,
  onBatchChange,
  selectedStatus,
  onStatusChange,
  employees,
}: ClosedLoanSummaryStripProps) {
  return (
    <div className="space-y-4">
      {/* 4 SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Closed Loans */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              Closed Loans
            </span>
            <strong className="text-xl sm:text-2xl font-black text-slate-900">
              {totalLoans}
            </strong>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              100% Repaid
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* Total Disbursed */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              Capital Disbursed
            </span>
            <strong className="text-xl sm:text-2xl font-black text-slate-900">
              {formatCurrency(totalDisbursed)}
            </strong>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              Principal Loaned
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Total Collected */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 block mb-1">
              Total Recovered
            </span>
            <strong className="text-xl sm:text-2xl font-black text-emerald-600">
              {formatCurrency(totalCollected)}
            </strong>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              Principal + Interest
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Profit */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 block mb-1">
              Gross Profit
            </span>
            <strong className="text-xl sm:text-2xl font-black text-indigo-900">
              {formatCurrency(totalProfit)}
            </strong>
            <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">
              Interest Earned
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search borrower name, phone, customer ID, or loan ID..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Team Leader Filter */}
          <select
            value={selectedLeader}
            onChange={(e) => onLeaderChange(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Leaders</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>

          {/* Batch Day Filter */}
          <select
            value={selectedBatch}
            onChange={(e) => onBatchChange(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Batches</option>
            <option value="tuesday">Tuesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
          </select>

          {/* Closure Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Statuses</option>
            <option value="on_time">Closed On Time</option>
            <option value="late">Closed Late</option>
            <option value="settled">Settled</option>
          </select>
        </div>
      </div>
    </div>
  )
}

