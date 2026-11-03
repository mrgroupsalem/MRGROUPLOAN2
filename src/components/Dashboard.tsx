'use client'

import { useState } from 'react'
import {
  Users,
  CreditCard,
  Wallet,
  Clock,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Download,
  CheckCircle,
  X,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useDashboardData } from '@/hooks/useDashboardData'
import { usePendingCollections, PendingCustomerItem } from '@/hooks/usePendingCollections'
import { useRole } from '@/components/RoleProvider'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Loan, Customer } from '@/types'
import KpiCard from './dashboard/KpiCard'
import TeamLeaderPendingCard from './dashboard/TeamLeaderPendingCard'
import QuickCollectModal from './dashboard/QuickCollectModal'
import BulkCollectModal from './dashboard/BulkCollectModal'
import NewLoansModal from './dashboard/NewLoansModal'
import CustomerProfileDrawer from './dashboard/CustomerProfileDrawer'
import EditCustomerLoanModal from './dashboard/EditCustomerLoanModal'
import ConfirmDeleteModal from './dashboard/ConfirmDeleteModal'
import WeekSelectorDrilldown from './dashboard/WeekSelectorDrilldown'
import ActivityFeed from './dashboard/ActivityFeed'

interface DashboardProps {
  onViewChange?: (view: string) => void
}

export default function Dashboard({ onViewChange }: DashboardProps) {
  const { user } = useRole()
  const {
    loans,
    customers,
    collections,
    employees,
    loading: dashLoading,
    newLoansStats,
    customersStats,
    loansBreakdown,
    financialStats,
    batchDetails,
    chartTrends,
    lastUpdated,
    refetch: refetchDash,
  } = useDashboardData()

  const {
    pendingCustomers,
    teamLeaderGroups,
    summary: pendingSummary,
    loading: pendingLoading,
    refetch: refetchPending,
  } = usePendingCollections()

  // Selection state for Bulk Collect
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set())
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)

  // Drawer & Modal states
  const [isNewLoansModalOpen, setIsNewLoansModalOpen] = useState(false)
  const [collectCustomer, setCollectCustomer] = useState<PendingCustomerItem | null>(null)
  const [profileDrawerCustomer, setProfileDrawerCustomer] = useState<{
    customer: Customer
    loan?: Loan | null
  } | null>(null)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [deletingLoan, setDeletingLoan] = useState<Loan | null>(null)

  // Feedback notifications
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Filters for Pending Section
  const [selectedLeaderFilter, setSelectedLeaderFilter] = useState<string>('all')
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all')
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('')

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const handleRefreshAll = async () => {
    await Promise.all([refetchDash(), refetchPending()])
  }

  // --- Selection Handlers ---
  const handleToggleSelectRow = (loanId: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev)
      if (next.has(loanId)) next.delete(loanId)
      else next.add(loanId)
      return next
    })
  }

  const handleToggleSelectGroup = (group: any) => {
    const groupLoanIds = group.customers.map((c: any) => c.loanId)
    const isAllSelected = groupLoanIds.every((id: string) => selectedCustomerIds.has(id))

    setSelectedCustomerIds((prev) => {
      const next = new Set(prev)
      if (isAllSelected) {
        groupLoanIds.forEach((id: string) => next.delete(id))
      } else {
        groupLoanIds.forEach((id: string) => next.add(id))
      }
      return next
    })
  }

  const handleSelectAllGlobal = () => {
    if (selectedCustomerIds.size === pendingCustomers.length) {
      setSelectedCustomerIds(new Set())
    } else {
      setSelectedCustomerIds(new Set(pendingCustomers.map((p) => p.loanId)))
    }
  }

  const handleClearSelection = () => {
    setSelectedCustomerIds(new Set())
  }

  // Calculate selected total amount
  const selectedItemsList = pendingCustomers.filter((p) => selectedCustomerIds.has(p.loanId))
  const selectedTotalAmount = selectedItemsList.reduce((sum, p) => sum + p.totalPendingAmount, 0)

  // Success Callback after collection
  const handleCollectionSuccess = (amount: number) => {
    setSuccessToast(`Successfully recorded collection of ${formatCurrency(amount)}!`)
    handleRefreshAll()
    setTimeout(() => setSuccessToast(null), 4000)
  }

  const handleBulkSuccess = (count: number, total: number, collectedIds: string[]) => {
    setSuccessToast(`${count} customers collected – ${formatCurrency(total)}`)
    // Remove collected from selection
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev)
      collectedIds.forEach((id) => next.delete(id))
      return next
    })
    handleRefreshAll()
    setTimeout(() => setSuccessToast(null), 4000)
  }

  // Delete customer handler
  const handleExecuteDelete = async () => {
    if (!deletingLoan?.customer_id) return
    const custId = deletingLoan.customer?.id || deletingLoan.customer_id
    const custName = deletingLoan.customer?.name || deletingLoan.customer_id

    const res = await fetch(`/api/customers/${custId}/delete`, {
      method: 'DELETE',
    })
    const json = await res.json()

    if (!res.ok || !json.success) {
      throw new Error(json?.error || 'Failed to delete customer.')
    }

    setSuccessToast(`Customer ${custName} and all records permanently deleted.`)
    setDeletingLoan(null)
    handleRefreshAll()
    setTimeout(() => setSuccessToast(null), 4000)
  }

  // Filtered Leader Groups
  const filteredLeaderGroups = teamLeaderGroups
    .map((group) => {
      let groupCusts = group.customers

      if (selectedBatchFilter !== 'all') {
        groupCusts = groupCusts.filter((c) => c.batchDay === selectedBatchFilter)
      }

      if (customerSearchQuery.trim()) {
        const q = customerSearchQuery.toLowerCase()
        groupCusts = groupCusts.filter(
          (c) =>
            c.customerName.toLowerCase().includes(q) ||
            c.customerPhone.includes(q) ||
            c.customerIdDisplay.toLowerCase().includes(q)
        )
      }

      return {
        ...group,
        customers: groupCusts,
        pendingCount: groupCusts.length,
        totalPendingAmount: groupCusts.reduce((sum, c) => sum + c.totalPendingAmount, 0),
      }
    })
    .filter((group) => {
      if (selectedLeaderFilter !== 'all' && group.teamLeaderId !== selectedLeaderFilter) {
        return false
      }
      return group.customers.length > 0 || group.collectedAmount > 0
    })

  const formatAxisCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`
    return `₹${val}`
  }

  const efficiencyData = [
    { name: 'Collected Today', value: pendingSummary.todayCollectedAmount, color: '#10b981' },
    { name: 'Pending Balance', value: pendingSummary.totalPendingAmount, color: '#f43f5e' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in relative pb-24">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-60 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-down">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{successToast}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {getGreeting()},{' '}
              <span className="text-primary-600">{user?.name || 'Administrator'}</span>
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live System
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {new Date().toLocaleDateString('en-IN', {
              timeZone: 'Asia/Kolkata',
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
            · MR Groups Loan Management Core
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            disabled={dashLoading || pendingLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh All Realtime Metrics"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${dashLoading || pendingLoading ? 'animate-spin text-primary-600' : ''}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS ROW (1 to 8) */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {/* Card 1: New Loans Today */}
          <KpiCard
            title="New Loans Today"
            value={newLoansStats.todayTotalCount}
            subLabel={`${newLoansStats.monthCount} originated this month`}
            icon={CreditCard}
            tone="blue"
            clickable
            onClick={() => setIsNewLoansModalOpen(true)}
            badge={
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                New: {newLoansStats.todayNewCount} | Ren: {newLoansStats.todayRenewalCount}
              </span>
            }
          />

          {/* Card 2: Total Customers */}
          <KpiCard
            title="Total Customers"
            value={formatNumber(customersStats.totalCount)}
            subLabel={`${customersStats.activeCount} active borrowers`}
            icon={Users}
            tone="indigo"
            clickable
            onClick={() => onViewChange && onViewChange('customers')}
            badge={
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 flex items-center gap-1">
                View Customers <ArrowUpRight className="w-3 h-3" />
              </span>
            }
          />

          {/* Card 3: Total Loans */}
          <KpiCard
            title="Total Loans"
            value={formatNumber(loansBreakdown.total)}
            subLabel="Loan book overview"
            icon={TrendingUp}
            tone="purple"
            clickable
            onClick={() => onViewChange && onViewChange('loans')}
            badge={
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                  {loansBreakdown.active} Act
                </span>
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                  {loansBreakdown.closed} Cls
                </span>
                {loansBreakdown.emergency > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                    {loansBreakdown.emergency} Emg
                  </span>
                )}
              </div>
            }
          />

          {/* Card 4: Pending Today */}
          <KpiCard
            title="Pending Due Today"
            value={formatCurrency(pendingSummary.totalPendingAmount)}
            subLabel={`${pendingSummary.totalPendingCount} pending borrower accounts`}
            icon={Clock}
            tone="rose"
            clickable
            onClick={() => {
              const el = document.getElementById('pending-section')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
            badge={
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                Action Required
              </span>
            }
          />
        </div>

        {/* Second Row of 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {/* Card 5: Today's Collection */}
          <KpiCard
            title="Today's Collection"
            value={formatCurrency(pendingSummary.todayCollectedAmount)}
            subLabel={`Target: ${formatCurrency(pendingSummary.todayTargetAmount)}`}
            icon={Wallet}
            tone="emerald"
            progress={pendingSummary.collectionProgress}
            badge={
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {pendingSummary.collectionProgress}% Met
              </span>
            }
          />

          {/* Card 6: Total Profit */}
          <KpiCard
            title="Total Realized Profit"
            value={formatCurrency(financialStats.totalProfit)}
            subLabel="Cumulative interest earned"
            icon={TrendingUp}
            tone="cyan"
            badge={
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                Net Profit
              </span>
            }
          />

          {/* Card 7: Total Balance Outstanding */}
          <KpiCard
            title="Outstanding Balance"
            value={formatCurrency(financialStats.totalOutstandingBalance)}
            subLabel="Principal + remaining interest"
            icon={Clock}
            tone="amber"
          />

          {/* Card 8: Total Disbursed */}
          <KpiCard
            title="Total Disbursed"
            value={formatCurrency(financialStats.totalDisbursed)}
            subLabel="Total capital originated"
            icon={CreditCard}
            tone="purple"
          />
        </div>
      </div>

      {/* PART 1: HERO SECTION - PENDING COLLECTION TODAY BY TEAM LEADER */}
      <div id="pending-section" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Pending Collections by Team Leader
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                {pendingSummary.totalPendingCount} Uncollected
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Includes current week due and carried-forward overdue balances
            </p>
          </div>

          {/* Filters Bar & Global Select All */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Global Select All */}
            {pendingCustomers.length > 0 && (
              <button
                onClick={handleSelectAllGlobal}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-colors"
              >
                {selectedCustomerIds.size === pendingCustomers.length ? 'Deselect All' : 'Select All'}
              </button>
            )}

            {/* Search Input */}
            <div className="relative w-full sm:w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                placeholder="Search borrower..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Filter by Leader */}
            <select
              value={selectedLeaderFilter}
              onChange={(e) => setSelectedLeaderFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Team Leaders</option>
              {teamLeaderGroups.map((g) => (
                <option key={g.teamLeaderId} value={g.teamLeaderId}>
                  {g.teamLeaderName} ({g.pendingCount})
                </option>
              ))}
            </select>

            {/* Filter by Batch Day */}
            <select
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Batches</option>
              <option value="tuesday">Tuesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
            </select>
          </div>
        </div>

        {/* Team Leader Cards Grid / List */}
        {filteredLeaderGroups.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">All Collections Up to Date</h4>
            <p className="text-xs text-slate-500 mt-1">
              No pending collections matching the selected filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLeaderGroups.map((group, idx) => (
              <TeamLeaderPendingCard
                key={group.teamLeaderId}
                group={group}
                selectedIds={selectedCustomerIds}
                onToggleSelectRow={handleToggleSelectRow}
                onToggleSelectGroup={handleToggleSelectGroup}
                defaultExpanded={idx === 0}
                onCollect={(customer) => setCollectCustomer(customer)}
                onViewProfile={(customer) => {
                  const custObj = customers.find((c) => c.id === customer.loan.customer_id) || {
                    id: customer.loan.customer_id,
                    name: customer.customerName,
                    phone: customer.customerPhone,
                    address: '',
                    created_at: customer.loan.created_at,
                  }
                  setProfileDrawerCustomer({ customer: custObj, loan: customer.loan })
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* PART 2: WEEKLY COLLECTION BATCHES & DRILL-DOWN */}
      <div className="pt-4">
        <WeekSelectorDrilldown
          loans={loans}
          collections={collections}
          employees={employees}
          onViewCustomer={(loan) => {
            const cust = customers.find((c) => c.id === loan.customer_id) || {
              id: loan.customer_id,
              name: loan.customer?.name || 'Customer',
              phone: loan.customer?.phone || '',
              address: '',
              created_at: loan.created_at,
            }
            setProfileDrawerCustomer({ customer: cust, loan })
          }}
          onEditCustomer={(loan) => setEditingLoan(loan)}
          onDeleteCustomer={(loan) => setDeletingLoan(loan)}
          onRefresh={handleRefreshAll}
        />
      </div>

      {/* CHARTS ROW & ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {/* Trend Chart: Loans Originated (2 Columns on large screens) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Originations & Disbursement Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Last 6 weeks loan capital originated</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700">
              Weekly Breakdown
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="weekLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={formatAxisCurrency}
                />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                  }}
                />
                <Bar
                  dataKey="disbursed"
                  name="Disbursed (₹)"
                  fill="#4f46e5"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Collection Efficiency Donut Chart (1 Column) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Collection Efficiency</h3>
            <p className="text-xs text-slate-500 mt-0.5">Today's collected vs remaining due</p>
          </div>

          <div className="h-56 w-full my-auto flex items-center justify-center">
            {pendingSummary.todayCollectedAmount === 0 &&
            pendingSummary.totalPendingAmount === 0 ? (
              <div className="text-center text-xs text-slate-400">No collection metrics today</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={efficiencyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {efficiencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY FEED */}
      <div className="pt-2">
        <ActivityFeed
          collections={collections}
          loans={loans}
          onViewLoans={() => onViewChange && onViewChange('loans')}
          onViewCollections={() => onViewChange && onViewChange('collections')}
        />
      </div>

      {/* STICKY BULK ACTION BAR */}
      {selectedCustomerIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-slide-up-sticky">
          <div className="bg-slate-900/95 backdrop-blur-xl text-white p-4 rounded-3xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-600/30 border border-primary-500/50 flex items-center justify-center font-black text-sm text-primary-400">
                {selectedCustomerIds.size}
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">
                  {selectedCustomerIds.size} borrower{selectedCustomerIds.size > 1 ? 's' : ''} selected
                </p>
                <p className="text-sm font-extrabold text-emerald-400">
                  Total: {formatCurrency(selectedTotalAmount)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearSelection}
                className="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>Collect Selected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS & DRAWERS */}
      {/* 1. New Loans Detail Modal */}
      <NewLoansModal
        isOpen={isNewLoansModalOpen}
        onClose={() => setIsNewLoansModalOpen(false)}
        loans={newLoansStats.todayLoansList}
        allLoans={loans}
        onViewCustomer={() => {
          if (onViewChange) onViewChange('customers')
        }}
      />

      {/* 2. Quick Collect Payment Modal */}
      {collectCustomer && (
        <QuickCollectModal
          customer={collectCustomer}
          isOpen={!!collectCustomer}
          onClose={() => setCollectCustomer(null)}
          onSuccess={handleCollectionSuccess}
        />
      )}

      {/* 3. Bulk Collect Modal */}
      {isBulkModalOpen && (
        <BulkCollectModal
          isOpen={isBulkModalOpen}
          selectedCustomers={selectedItemsList}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={handleBulkSuccess}
        />
      )}

      {/* 4. Customer Profile Drawer (A-to-Z profile) */}
      {profileDrawerCustomer && (
        <CustomerProfileDrawer
          isOpen={!!profileDrawerCustomer}
          customer={profileDrawerCustomer.customer}
          loan={profileDrawerCustomer.loan}
          allLoans={loans}
          collections={collections}
          onClose={() => setProfileDrawerCustomer(null)}
          onCollect={(loan) => {
            const pItem = pendingCustomers.find((p) => p.loanId === loan.id)
            if (pItem) setCollectCustomer(pItem)
          }}
          onEdit={(loan) => setEditingLoan(loan)}
        />
      )}

      {/* 5. Edit Loan & Customer Modal */}
      {editingLoan && (
        <EditCustomerLoanModal
          loan={editingLoan}
          employees={employees}
          isOpen={!!editingLoan}
          onClose={() => setEditingLoan(null)}
          onSaveSuccess={() => {
            setSuccessToast('Customer and loan records updated successfully!')
            handleRefreshAll()
            setTimeout(() => setSuccessToast(null), 4000)
          }}
        />
      )}

      {/* 6. Confirm Permanent Delete Modal */}
      {deletingLoan && (
        <ConfirmDeleteModal
          isOpen={!!deletingLoan}
          customerName={deletingLoan.customer?.name || deletingLoan.customer_id}
          customerId={deletingLoan.customer_id}
          onClose={() => setDeletingLoan(null)}
          onConfirm={handleExecuteDelete}
        />
      )}
    </div>
  )
}
