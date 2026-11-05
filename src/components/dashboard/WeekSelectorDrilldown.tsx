'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  X,
  Wallet,
  Sparkles,
  UserCheck,
  TrendingUp,
} from 'lucide-react'
import { Loan, Collection, Employee } from '@/types'
import { formatCurrency } from '@/lib/utils'
import {
  useWeekBatchData,
  DayBatchKey,
  LeaderBatchGroup,
  customerBatchItemToPendingItem,
} from '@/hooks/useWeekBatchData'
import BulkCollectModal from './BulkCollectModal'
import PhotoLightbox from '@/components/ui/PhotoLightbox'
import CustomerNameLink from '@/components/ui/CustomerNameLink'

interface WeekSelectorDrilldownProps {
  loans: Loan[]
  collections: Collection[]
  employees: Employee[]
  onViewCustomer: (loan: Loan) => void
  onEditCustomer: (loan: Loan) => void
  onDeleteCustomer: (loan: Loan) => void
  onRefresh?: () => void
}

export default function WeekSelectorDrilldown({
  loans,
  collections,
  employees,
  onViewCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onRefresh,
}: WeekSelectorDrilldownProps) {
  // Week offset from current week (0 = current week, -1 = last week, +1 = next week)
  const [weekOffset, setWeekOffset] = useState<number>(0)

  // Currently open Day Box ('tuesday' | 'thursday' | 'friday' | null)
  const [selectedDay, setSelectedDay] = useState<DayBatchKey | null>(null)

  // Search query for team leaders inside the opened day panel
  const [leaderSearchQuery, setLeaderSearchQuery] = useState<string>('')

  // Map of leaderId -> boolean (which leader accordion is expanded)
  const [expandedLeaders, setExpandedLeaders] = useState<Record<string, boolean>>({})

  // Multi-selection set of loanIds for bulk collection
  const [selectedLoanIds, setSelectedLoanIds] = useState<Set<string>>(new Set())

  // Lightbox for customer avatars in drill-down
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; title: string } | null>(null)

  // Bulk Collect Modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false)

  // Local notification toast
  const [drillToast, setDrillToast] = useState<string | null>(null)

  // Fetch full hierarchy data
  const weekHierarchy = useWeekBatchData(loans, collections, employees, weekOffset)
  const { weekRange, summary, days, allCustomersMap } = weekHierarchy

  // Set initial open day: Today if Tuesday/Thursday/Friday, otherwise first day with borrowers or tuesday
  useEffect(() => {
    if (selectedDay === null) {
      if (days.tuesday.isToday) {
        setSelectedDay('tuesday')
      } else if (days.thursday.isToday) {
        setSelectedDay('thursday')
      } else if (days.friday.isToday) {
        setSelectedDay('friday')
      } else {
        const firstWithBorrowers = (['tuesday', 'thursday', 'friday'] as DayBatchKey[]).find(
          (k) => days[k].borrowersCount > 0
        )
        setSelectedDay(firstWithBorrowers || 'tuesday')
      }
    }
  }, [weekOffset, days, selectedDay])

  // Clear selections when switching weeks
  useEffect(() => {
    setSelectedLoanIds(new Set())
    setExpandedLeaders({})
    setLeaderSearchQuery('')
  }, [weekOffset])

  // Toast auto-clear
  useEffect(() => {
    if (drillToast) {
      const timer = setTimeout(() => setDrillToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [drillToast])

  // Current active day data
  const currentDayData = selectedDay ? days[selectedDay] : null

  // Filtered leaders for active day based on search query
  const filteredLeaders = useMemo(() => {
    if (!currentDayData) return []
    const q = leaderSearchQuery.trim().toLowerCase()
    if (!q) return currentDayData.leaders

    return currentDayData.leaders.filter((l) =>
      l.teamLeaderName.toLowerCase().includes(q)
    )
  }, [currentDayData, leaderSearchQuery])

  // Toggle leader accordion
  const toggleLeader = (leaderId: string) => {
    setExpandedLeaders((prev) => ({
      ...prev,
      [leaderId]: !prev[leaderId],
    }))
  }

  // Toggle single customer row selection
  const handleToggleCustomer = (loanId: string) => {
    setSelectedLoanIds((prev) => {
      const next = new Set(prev)
      if (next.has(loanId)) {
        next.delete(loanId)
      } else {
        next.add(loanId)
      }
      return next
    })
  }

  // Toggle all customers under a specific team leader
  const handleToggleLeaderAll = (leader: LeaderBatchGroup) => {
    const leaderLoanIds = leader.customers.map((c) => c.loan.id)
    const allSelected = leaderLoanIds.every((id) => selectedLoanIds.has(id))

    setSelectedLoanIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        leaderLoanIds.forEach((id) => next.delete(id))
      } else {
        leaderLoanIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  // Toggle all customers in the entire opened day box
  const handleToggleDayAll = () => {
    if (!currentDayData) return
    const allDayLoanIds = currentDayData.leaders.flatMap((l) =>
      l.customers.map((c) => c.loan.id)
    )
    const allSelected =
      allDayLoanIds.length > 0 && allDayLoanIds.every((id) => selectedLoanIds.has(id))

    setSelectedLoanIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        allDayLoanIds.forEach((id) => next.delete(id))
      } else {
        allDayLoanIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  // Selected customers mapped to PendingCustomerItem for BulkCollectModal
  const selectedItemsForModal = useMemo(() => {
    const list: ReturnType<typeof customerBatchItemToPendingItem>[] = []
    selectedLoanIds.forEach((loanId) => {
      const item = allCustomersMap[loanId]
      if (item) {
        list.push(customerBatchItemToPendingItem(item))
      }
    })
    return list
  }, [selectedLoanIds, allCustomersMap])

  // Total amount selected for bulk collection
  const selectedTotalAmount = useMemo(() => {
    return selectedItemsForModal.reduce((sum, item) => sum + item.totalPendingAmount, 0)
  }, [selectedItemsForModal])

  // Handle successful bulk collect
  const handleBulkSuccess = (count: number, total: number, collectedIds: string[]) => {
    setDrillToast(`Successfully collected ${formatCurrency(total)} from ${count} borrowers!`)
    setSelectedLoanIds((prev) => {
      const next = new Set(prev)
      collectedIds.forEach((id) => next.delete(id))
      return next
    })
    setIsBulkModalOpen(false)
    if (onRefresh) onRefresh()
  }

  // Day Box Themes
  const dayThemeConfig: Record<
    DayBatchKey,
    {
      name: string
      bgGradient: string
      bgActive: string
      borderIdle: string
      borderActive: string
      accentText: string
      badgeTone: string
      progressBar: string
      btnHover: string
    }
  > = {
    tuesday: {
      name: 'Tuesday',
      bgGradient: 'from-blue-50/70 via-indigo-50/30 to-white',
      bgActive: 'bg-blue-50/50',
      borderIdle: 'border-blue-200/80 hover:border-blue-400 hover:shadow-xl',
      borderActive: 'border-blue-600 shadow-xl ring-2 ring-blue-500/30',
      accentText: 'text-blue-900',
      badgeTone: 'bg-blue-100 text-blue-800 border-blue-200',
      progressBar: 'bg-blue-600',
      btnHover: 'hover:bg-blue-600 hover:text-white',
    },
    thursday: {
      name: 'Thursday',
      bgGradient: 'from-emerald-50/70 via-teal-50/30 to-white',
      bgActive: 'bg-emerald-50/50',
      borderIdle: 'border-emerald-200/80 hover:border-emerald-400 hover:shadow-xl',
      borderActive: 'border-emerald-600 shadow-xl ring-2 ring-emerald-500/30',
      accentText: 'text-emerald-900',
      badgeTone: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      progressBar: 'bg-emerald-600',
      btnHover: 'hover:bg-emerald-600 hover:text-white',
    },
    friday: {
      name: 'Friday',
      bgGradient: 'from-purple-50/70 via-fuchsia-50/30 to-white',
      bgActive: 'bg-purple-50/50',
      borderIdle: 'border-purple-200/80 hover:border-purple-400 hover:shadow-xl',
      borderActive: 'border-purple-600 shadow-xl ring-2 ring-purple-500/30',
      accentText: 'text-purple-900',
      badgeTone: 'bg-purple-100 text-purple-800 border-purple-200',
      progressBar: 'bg-purple-600',
      btnHover: 'hover:bg-purple-600 hover:text-white',
    },
  }

  // Active expanded leader for breadcrumb
  const firstExpandedLeaderId = Object.keys(expandedLeaders).find((k) => expandedLeaders[k])
  const activeExpandedLeader = currentDayData?.leaders.find(
    (l) => l.teamLeaderId === firstExpandedLeaderId
  )

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgb(0,0,0,0.04)] p-6 sm:p-8 space-y-7 relative">
      {/* Lightbox for Zooming Customer Avatars */}
      {lightboxPhoto && (
        <PhotoLightbox
          isOpen={!!lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
          photos={[{ url: lightboxPhoto.url, title: lightboxPhoto.title }]}
          alt={lightboxPhoto.title}
        />
      )}

      {/* Toast Notification */}
      {drillToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-slide-down">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-bold">{drillToast}</span>
        </div>
      )}

      {/* HEADER + WEEK SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Weekly Collection Drill-Down
            </h3>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-primary-50 text-primary-700 border border-primary-200 shadow-sm">
              Day-Batch Hierarchy
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cycle breakdown: Week → 3 Day Batches (Tue / Thu / Fri) → Team Leaders → Borrower Collections
          </p>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl shadow-sm self-start md:self-auto">
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="w-9 h-9 rounded-xl hover:bg-white text-slate-600 hover:shadow-sm flex items-center justify-center transition-all"
            title="Previous Week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="px-4 py-1 text-center">
            <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-600" />
              {weekRange.label}
            </span>
          </div>

          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="w-9 h-9 rounded-xl hover:bg-white text-slate-600 hover:shadow-sm flex items-center justify-center transition-all"
            title="Next Week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {!weekRange.isCurrent && (
            <button
              onClick={() => setWeekOffset(0)}
              className="ml-1 px-3 py-1.5 text-xs font-black bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-sm"
            >
              This Week
            </button>
          )}
        </div>
      </div>

      {/* MOBILE SEGMENTED TABS (<768px) */}
      <div className="block md:hidden">
        <div className="flex rounded-2xl bg-slate-100 p-1.5 gap-1">
          {(['tuesday', 'thursday', 'friday'] as DayBatchKey[]).map((k) => {
            const isTabActive = selectedDay === k
            const d = days[k]
            return (
              <button
                key={k}
                onClick={() => setSelectedDay(selectedDay === k ? null : k)}
                className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center ${
                  isTabActive
                    ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="capitalize">{k}</span>
                <span className="text-[10px] font-bold text-slate-500 font-mono mt-0.5">
                  {formatCurrency(d.expectedEmi)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* STEP 1: THREE DAY BOXES (Desktop & Tablet) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Select Day Batch to Drill-Down:
          </h4>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Click any day card to inspect team leaders & borrowers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(['tuesday', 'thursday', 'friday'] as DayBatchKey[]).map((dayKey) => {
            const day = days[dayKey]
            const theme = dayThemeConfig[dayKey]
            const isSelected = selectedDay === dayKey

            return (
              <div
                key={dayKey}
                onClick={() => setSelectedDay(selectedDay === dayKey ? null : dayKey)}
                className={`group relative rounded-3xl border p-6 sm:p-7 cursor-pointer transition-all duration-300 select-none bg-gradient-to-br ${
                  theme.bgGradient
                } ${
                  isSelected
                    ? `${theme.borderActive} ${theme.bgActive}`
                    : `bg-white ${theme.borderIdle}`
                } ${
                  day.isToday
                    ? 'ring-2 ring-primary-500 ring-offset-2 shadow-lg'
                    : ''
                }`}
              >
                {/* Top Header: Today Focus (Left) and Status Badge (Right) */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {/* Today Focus Pill */}
                  {day.isToday ? (
                    <span className="px-3 py-1 rounded-full bg-primary-600 text-white text-[11px] font-black tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                      Today Focus
                    </span>
                  ) : (
                    <div />
                  )}

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase shadow-sm ${
                      day.status === 'Today'
                        ? 'bg-primary-100 text-primary-800 border border-primary-300'
                        : day.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : day.status === 'Overdue'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {day.status === 'Today' && <Sparkles className="w-3.5 h-3.5 text-primary-600" />}
                    {day.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {day.status === 'Overdue' && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                    {day.status === 'Upcoming' && <Clock className="w-3.5 h-3.5 text-slate-500" />}
                    {day.status}
                  </span>
                </div>

                {/* Main Content: Center-Aligned Day Name & Exact Date */}
                <div className="text-center my-3">
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {theme.name}
                  </h3>
                  <span className="text-xs sm:text-sm font-bold text-slate-500 block mt-1">
                    {day.formattedDate.replace(`${theme.name} · `, '')}
                  </span>

                  {/* Leaders & Borrowers Chip */}
                  <div className="inline-flex items-center gap-2 mt-3 px-3.5 py-1 rounded-full bg-white/90 border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{day.leadersCount} Leaders</span>
                    <span className="text-slate-300">•</span>
                    <span>{day.borrowersCount} Borrowers</span>
                  </div>
                </div>

                {/* 3-Column Financials Grid with Dividers */}
                <div className="mt-5 pt-4 border-t border-slate-200/80 grid grid-cols-3 text-center">
                  <div className="px-1 border-r border-slate-200">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Expected
                    </span>
                    <strong className="text-base sm:text-lg font-black text-slate-900 block truncate">
                      {formatCurrency(day.expectedEmi)}
                    </strong>
                  </div>

                  <div className="px-1 border-r border-slate-200">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                      Collected
                    </span>
                    <strong className="text-base sm:text-lg font-black text-emerald-600 block truncate">
                      {formatCurrency(day.collectedAmount)}
                    </strong>
                  </div>

                  <div className="px-1">
                    <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block mb-1">
                      Pending
                    </span>
                    <strong className="text-base sm:text-lg font-black text-rose-600 block truncate">
                      {formatCurrency(day.pendingAmount)}
                    </strong>
                  </div>
                </div>

                {/* Clamped Progress Bar & Status Pill */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
                    <span>Collection Progress</span>
                    {day.isOverCollected ? (
                      <span className="text-emerald-700 font-black text-[11px] bg-emerald-100 px-2 py-0.5 rounded-md">
                        Over-collected
                      </span>
                    ) : day.isFullyCollected ? (
                      <span className="text-emerald-700 font-black text-[11px] bg-emerald-100 px-2 py-0.5 rounded-md">
                        Fully collected
                      </span>
                    ) : (
                      <span className="font-mono">{day.collectionRate}%</span>
                    )}
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${theme.progressBar}`}
                      style={{ width: `${day.collectionRate}%` }}
                    />
                  </div>
                </div>

                {/* Footer Full-Width Button */}
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <div
                    className={`w-full py-2.5 px-4 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : `bg-white/80 text-slate-700 border-slate-200 ${theme.btnHover}`
                    }`}
                  >
                    <span>{isSelected ? 'Collapse Batch' : 'View Team Leaders'}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-300 ${
                        isSelected ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* STEP 2: OPENED DAY BOX DETAILS PANEL */}
      {selectedDay && currentDayData && (
        <div className="pt-3 animate-fade-in space-y-5">
          <div
            className={`border rounded-3xl p-6 sm:p-7 ${
              dayThemeConfig[selectedDay].bgActive
            } ${dayThemeConfig[selectedDay].borderActive}`}
          >
            {/* Top Bar: Breadcrumb + Search + Day Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
              {/* Clickable Breadcrumb */}
              <nav className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 flex-wrap">
                <button
                  onClick={() => setSelectedDay(null)}
                  className="hover:text-primary-600 transition-colors flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {weekRange.label}
                </button>
                <span className="text-slate-400 font-bold">›</span>

                <button
                  onClick={() => {
                    setExpandedLeaders({})
                    setLeaderSearchQuery('')
                  }}
                  className={`px-3 py-1 rounded-xl font-black text-xs transition-colors shadow-sm ${
                    dayThemeConfig[selectedDay].badgeTone
                  }`}
                >
                  {currentDayData.formattedDate}
                </button>

                {activeExpandedLeader && (
                  <>
                    <span className="text-slate-400 font-bold">›</span>
                    <span className="text-slate-900 font-black bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-sm text-xs">
                      {activeExpandedLeader.teamLeaderName} ({activeExpandedLeader.totalBorrowers}{' '}
                      Borrowers)
                    </span>
                  </>
                )}
              </nav>

              {/* Right: Search Filter & Select All Day */}
              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search team leader..."
                    value={leaderSearchQuery}
                    onChange={(e) => setLeaderSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white rounded-2xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-all"
                  />
                  {leaderSearchQuery && (
                    <button
                      onClick={() => setLeaderSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Day-wide Select All Checkbox */}
                {currentDayData.borrowersCount > 0 && (
                  <button
                    onClick={handleToggleDayAll}
                    className="px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-black text-slate-700 flex items-center gap-2 shadow-sm transition-all"
                  >
                    <UserCheck className="w-4 h-4 text-primary-600" />
                    <span>Select All {currentDayData.label}</span>
                  </button>
                )}
              </div>
            </div>

            {/* TEAM LEADERS OF THAT DAY LIST */}
            <div className="mt-5 space-y-4">
              {filteredLeaders.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-3xl border border-slate-200">
                  <p className="text-sm font-semibold text-slate-500">
                    {leaderSearchQuery
                      ? `No team leaders matching "${leaderSearchQuery}" on ${currentDayData.label}.`
                      : `No active team leaders with scheduled collections for ${currentDayData.label}.`}
                  </p>
                </div>
              ) : (
                filteredLeaders.map((leader) => {
                  const isExpanded = !!expandedLeaders[leader.teamLeaderId]
                  const leaderLoanIds = leader.customers.map((c) => c.loan.id)
                  const isAllLeaderSelected =
                    leaderLoanIds.length > 0 &&
                    leaderLoanIds.every((id) => selectedLoanIds.has(id))
                  const isSomeLeaderSelected =
                    !isAllLeaderSelected && leaderLoanIds.some((id) => selectedLoanIds.has(id))

                  return (
                    <div
                      key={leader.teamLeaderId}
                      className={`border rounded-3xl overflow-hidden transition-all duration-300 bg-white ${
                        isExpanded
                          ? 'border-slate-300 shadow-lg ring-1 ring-slate-200'
                          : 'border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {/* LEADER HEADER ROW */}
                      <div className="p-5 bg-slate-50/80 hover:bg-slate-100/70 flex items-center justify-between gap-4 select-none transition-colors">
                        <div className="flex items-center gap-4">
                          {/* Leader Select-All Checkbox */}
                          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isAllLeaderSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = isSomeLeaderSelected
                              }}
                              onChange={() => handleToggleLeaderAll(leader)}
                              className="w-5 h-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                              title="Select all borrowers of this team leader"
                            />
                          </div>

                          {/* Leader Avatar (48px) */}
                          <div
                            onClick={() => toggleLeader(leader.teamLeaderId)}
                            className="cursor-pointer flex items-center gap-3.5"
                          >
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-900 to-primary-700 text-white font-black flex items-center justify-center text-sm shadow-md">
                              {leader.teamLeaderName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h5 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                {leader.teamLeaderName}
                              </h5>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-medium">
                                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 font-bold text-slate-700">
                                  {leader.totalBorrowers} Borrowers
                                </span>
                                <span>•</span>
                                <span>Target: {formatCurrency(leader.expectedEmi)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Leader Financial Pill Chips & Expand Toggle */}
                        <div
                          onClick={() => toggleLeader(leader.teamLeaderId)}
                          className="flex items-center gap-4 sm:gap-6 cursor-pointer"
                        >
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">
                              Collected
                            </span>
                            <strong className="text-sm font-black text-emerald-600 block">
                              {formatCurrency(leader.collectedAmount)}
                            </strong>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">
                              Pending
                            </span>
                            <strong className="text-sm font-black text-rose-600 block">
                              {formatCurrency(leader.pendingAmount)}
                            </strong>
                          </div>

                          {/* Thin Progress Bar Pill */}
                          <div className="hidden lg:flex flex-col items-end gap-1 w-24">
                            <span className="text-[10px] font-black text-slate-600">
                              {leader.isOverCollected
                                ? 'Over-collected'
                                : `${leader.collectionRate}%`}
                            </span>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-600 rounded-full"
                                style={{ width: `${leader.collectionRate}%` }}
                              />
                            </div>
                          </div>

                          {/* Expand chevron */}
                          <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-600 shadow-sm flex items-center justify-center">
                            <ChevronDown
                              className={`w-5 h-5 transition-transform duration-300 ${
                                isExpanded ? 'rotate-180 text-primary-600' : ''
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* STEP 3: CUSTOMERS PER LEADER TABLE */}
                      {isExpanded && (
                        <div className="p-5 bg-white border-t border-slate-100 space-y-4 animate-fade-in">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                              <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider text-[11px]">
                                  <th className="pb-3 pl-2 w-10">
                                    <span className="sr-only">Select</span>
                                  </th>
                                  <th className="pb-3 px-3">Borrower & Loan</th>
                                  <th className="pb-3 px-3">Weekly EMI</th>
                                  <th className="pb-3 px-3">Carry Forward</th>
                                  <th className="pb-3 px-3">Total Due</th>
                                  <th className="pb-3 px-3">Status</th>
                                  <th className="pb-3 px-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {leader.customers.map((c) => {
                                  const isRowSelected = selectedLoanIds.has(c.loan.id)

                                  return (
                                    <tr
                                      key={c.loan.id}
                                      className={`transition-colors ${
                                        isRowSelected ? 'bg-primary-50/50' : 'hover:bg-slate-50/80'
                                      }`}
                                    >
                                      {/* Row Checkbox */}
                                      <td className="py-3.5 pl-2 w-10">
                                        <input
                                          type="checkbox"
                                          checked={isRowSelected}
                                          onChange={() => handleToggleCustomer(c.loan.id)}
                                          className="w-5 h-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                        />
                                      </td>

                                      {/* Customer Info + Photo (44px avatar, click opens PhotoLightbox) */}
                                      <td className="py-3.5 px-3">
                                        <div className="flex items-center gap-3">
                                          <div
                                            onClick={() =>
                                              c.photoUrl &&
                                              setLightboxPhoto({
                                                url: c.photoUrl,
                                                title: c.customerName,
                                              })
                                            }
                                            className={`w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center font-black text-xs flex-shrink-0 border shadow-sm ${
                                              c.photoUrl
                                                ? 'cursor-pointer border-slate-200 hover:opacity-90'
                                                : 'bg-slate-100 text-slate-700 border-slate-200'
                                            }`}
                                          >
                                            {c.photoUrl ? (
                                              <img
                                                src={c.photoUrl}
                                                alt={c.customerName}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              c.customerName.slice(0, 2).toUpperCase()
                                            )}
                                          </div>
                                          <div>
                                            <CustomerNameLink
                                              customerId={c.loan.customer_id}
                                              name={c.customerName}
                                              loan={c.loan}
                                              className="text-sm sm:text-base font-black text-slate-900 block leading-tight"
                                            />
                                            <span className="text-xs text-slate-400 font-mono">
                                              {c.customerPhone ? `${c.customerPhone} · ` : ''}
                                              {c.loanId}
                                            </span>
                                          </div>
                                        </div>
                                      </td>

                                      {/* Weekly EMI */}
                                      <td className="py-3.5 px-3 font-bold text-slate-800">
                                        {formatCurrency(c.emi)}
                                      </td>

                                      {/* Carry-Forward Previous Pending */}
                                      <td className="py-3.5 px-3">
                                        {c.previousPending > 0 ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                                            +{formatCurrency(c.previousPending)} ({c.missedWeeks} wk)
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 text-xs">—</span>
                                        )}
                                      </td>

                                      {/* Total Due */}
                                      <td className="py-3.5 px-3 font-black text-slate-900">
                                        {formatCurrency(c.totalDue)}
                                      </td>

                                      {/* Status Badge */}
                                      <td className="py-3.5 px-3">
                                        <span
                                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                                            c.status === 'Paid'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : c.status === 'Overdue'
                                              ? 'bg-rose-100 text-rose-800'
                                              : 'bg-amber-100 text-amber-800'
                                          }`}
                                        >
                                          {c.status === 'Paid' ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          ) : c.status === 'Overdue' ? (
                                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                          ) : (
                                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                                          )}
                                          {c.status}
                                        </span>
                                      </td>

                                      {/* Action Buttons: View / Edit / Delete (Min 44px Tap Target) */}
                                      <td className="py-3.5 px-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          {/* View Profile (Eye) */}
                                          <button
                                            onClick={() => onViewCustomer(c.loan)}
                                            className="w-10 h-10 rounded-2xl border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50/50 flex items-center justify-center transition-colors shadow-sm"
                                            title="View Customer Profile (A-to-Z)"
                                          >
                                            <Eye className="w-4 h-4" />
                                          </button>

                                          {/* Edit Customer / Loan (Pencil) */}
                                          <button
                                            onClick={() => onEditCustomer(c.loan)}
                                            className="w-10 h-10 rounded-2xl border border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50/50 flex items-center justify-center transition-colors shadow-sm"
                                            title="Edit Loan & Customer Details"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </button>

                                          {/* Delete Customer (Trash) */}
                                          <button
                                            onClick={() => onDeleteCustomer(c.loan)}
                                            className="w-10 h-10 rounded-2xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50 flex items-center justify-center transition-colors shadow-sm"
                                            title="Permanently Delete Customer"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* STICKY BULK ACTION BAR */}
      {selectedLoanIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl border border-slate-700/80 flex items-center gap-6 animate-slide-up">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-slate-200">
              <strong className="text-white text-base">{selectedLoanIds.size}</strong>{' '}
              {selectedLoanIds.size === 1 ? 'borrower' : 'borrowers'} selected
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs sm:text-sm font-black text-emerald-400">
              Total {formatCurrency(selectedTotalAmount)}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <Wallet className="w-4 h-4" />
              Collect Selected
            </button>

            <button
              onClick={() => setSelectedLoanIds(new Set())}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs sm:text-sm font-bold transition-all"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* BULK COLLECT MODAL */}
      {isBulkModalOpen && (
        <BulkCollectModal
          isOpen={isBulkModalOpen}
          selectedCustomers={selectedItemsForModal}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={handleBulkSuccess}
        />
      )}
    </div>
  )
}
