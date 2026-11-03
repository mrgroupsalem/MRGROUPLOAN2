import { useMemo } from 'react'
import { Loan, Collection, Employee } from '@/types'
import { calculateEMI, calculateTotalPayable, PendingCustomerItem } from '@/hooks/usePendingCollections'
import { isLoanDueInWeek } from '@/lib/dueSchedule'

export type DayBatchKey = 'tuesday' | 'thursday' | 'friday'

export interface CustomerBatchItem {
  loan: Loan
  customerName: string
  customerPhone: string
  customerIdDisplay: string
  photoUrl?: string
  loanId: string
  emi: number
  previousPending: number
  missedWeeks: number
  totalDue: number
  status: 'Paid' | 'Pending' | 'Overdue'
  collectedAmount: number
  batchDay: DayBatchKey
  teamLeaderId: string
  teamLeaderName: string
}

export interface LeaderBatchGroup {
  teamLeaderId: string
  teamLeaderName: string
  totalBorrowers: number
  expectedEmi: number
  collectedAmount: number
  pendingAmount: number
  collectionRate: number
  isOverCollected: boolean
  isFullyCollected: boolean
  customers: CustomerBatchItem[]
}

export interface DayBatchData {
  key: DayBatchKey
  label: string
  date: Date
  dateStr: string
  formattedDate: string
  status: 'Today' | 'Upcoming' | 'Completed' | 'Overdue'
  isToday: boolean
  leadersCount: number
  borrowersCount: number
  expectedEmi: number
  collectedAmount: number
  pendingAmount: number
  collectionRate: number
  isOverCollected: boolean
  isFullyCollected: boolean
  leaders: LeaderBatchGroup[]
}

export interface WeekBatchHierarchy {
  weekRange: {
    start: Date
    end: Date
    label: string
    isCurrent: boolean
    weekOffset: number
  }
  summary: {
    targetWeekEmi: number
    collectedThisWeek: number
    pendingBalance: number
  }
  days: Record<DayBatchKey, DayBatchData>
  allCustomersMap: Record<string, CustomerBatchItem>
}

// Convert CustomerBatchItem into PendingCustomerItem for BulkCollectModal
export function customerBatchItemToPendingItem(c: CustomerBatchItem): PendingCustomerItem {
  const totalLoanAmt = calculateTotalPayable(c.loan)
  const remaining = Math.max(0, totalLoanAmt - c.collectedAmount)
  return {
    loanId: c.loan.id,
    loan: c.loan,
    customerName: c.customerName,
    customerPhone: c.customerPhone,
    customerIdDisplay: c.customerIdDisplay,
    teamLeaderId: c.teamLeaderId,
    teamLeaderName: c.teamLeaderName,
    batchDay: c.batchDay,
    weeklyEmi: c.emi,
    currentCycleEmi: c.emi,
    previousPendingAmount: c.previousPending,
    totalPendingAmount: c.totalDue > 0 ? c.totalDue : c.emi,
    missedWeeksCount: c.missedWeeks > 0 ? c.missedWeeks : 1,
    daysOverdue: c.status === 'Overdue' ? Math.max(1, c.missedWeeks * 7) : 0,
    status: c.status === 'Overdue' ? 'overdue' : 'pending',
    remainingBalance: remaining,
    totalLoanAmount: totalLoanAmt,
    totalCollectedSoFar: c.collectedAmount,
  }
}

/**
 * Calculates start and end of week (Monday to Sunday) in Asia/Kolkata timezone
 */
export function getWeekDateRange(weekOffset: number = 0) {
  const now = new Date()
  const istDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) // YYYY-MM-DD
  const [year, month, day] = istDateStr.split('-').map(Number)

  // Use UTC to prevent local browser timezone offset skew
  const todayIst = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = todayIst.getUTCDay() // 0 = Sun, 1 = Mon, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const monday = new Date(todayIst)
  monday.setUTCDate(todayIst.getUTCDate() + diffToMonday + weekOffset * 7)
  monday.setUTCHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  sunday.setUTCHours(23, 59, 59, 999)

  const tuesday = new Date(monday)
  tuesday.setUTCDate(monday.getUTCDate() + 1)

  const thursday = new Date(monday)
  thursday.setUTCDate(monday.getUTCDate() + 3)

  const friday = new Date(monday)
  friday.setUTCDate(monday.getUTCDate() + 4)

  const startLabel = monday.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
  })
  const endLabel = sunday.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return {
    start: monday,
    end: sunday,
    label: `Week of ${startLabel} – ${endLabel}`,
    isCurrent: weekOffset === 0,
    weekOffset,
    todayIstStr: istDateStr,
    dayDates: {
      tuesday,
      thursday,
      friday,
    },
  }
}

/**
 * Main hierarchy builder:
 * Week → Day Boxes (Tuesday / Thursday / Friday) → Team Leaders of that day → Customers
 */
export function getWeekBatchHierarchy(
  loans: Loan[],
  collections: Collection[],
  employees: Employee[],
  weekOffset: number = 0
): WeekBatchHierarchy {
  const weekInfo = getWeekDateRange(weekOffset)
  const { start, end, todayIstStr, dayDates } = weekInfo

  const employeeMap = new Map<string, string>()
  employees.forEach((emp) => {
    employeeMap.set(emp.id, emp.name)
  })

  // Format exact day dates in IST: e.g. "Tuesday · 3 Nov 2026"
  const formatDayDisplay = (d: Date, dayName: string) => {
    const formatted = d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return `${dayName} · ${formatted}`
  }

  // Pre-initialize the 3 days
  const dayConfigs: Record<
    DayBatchKey,
    {
      key: DayBatchKey
      label: string
      date: Date
      dateStr: string
      formattedDate: string
    }
  > = {
    tuesday: {
      key: 'tuesday',
      label: 'Tuesday',
      date: dayDates.tuesday,
      dateStr: dayDates.tuesday.toISOString().slice(0, 10),
      formattedDate: formatDayDisplay(dayDates.tuesday, 'Tuesday'),
    },
    thursday: {
      key: 'thursday',
      label: 'Thursday',
      date: dayDates.thursday,
      dateStr: dayDates.thursday.toISOString().slice(0, 10),
      formattedDate: formatDayDisplay(dayDates.thursday, 'Thursday'),
    },
    friday: {
      key: 'friday',
      label: 'Friday',
      date: dayDates.friday,
      dateStr: dayDates.friday.toISOString().slice(0, 10),
      formattedDate: formatDayDisplay(dayDates.friday, 'Friday'),
    },
  }

  // Group active loans by day -> leader
  const dayLeaderMap: Record<
    DayBatchKey,
    Record<
      string,
      {
        teamLeaderId: string
        teamLeaderName: string
        customers: CustomerBatchItem[]
      }
    >
  > = {
    tuesday: {},
    thursday: {},
    friday: {},
  }

  const allCustomersMap: Record<string, CustomerBatchItem> = {}

  // Process loans
  loans.forEach((loan) => {
    if (loan.status !== 'active') return
    if (!isLoanDueInWeek(loan, start, end)) return

    const rawBatch = (loan.weekly_batch || '').toLowerCase()
    const batchKey: DayBatchKey =
      rawBatch === 'thursday' ? 'thursday' : rawBatch === 'friday' ? 'friday' : 'tuesday'

    const leaderId = loan.team_leader_id || 'unassigned'
    const leaderName =
      (loan.team_leader_id && employeeMap.get(loan.team_leader_id)) ||
      loan.team_leader?.name ||
      (leaderId === 'unassigned' ? 'Unassigned Leader' : 'Team Leader')

    const emi = calculateEMI(loan)

    // Collections recorded during this week window
    const weekCollections = collections.filter((c) => {
      if (c.loan_id !== loan.id) return false
      const dt = new Date(c.collection_date).getTime()
      return dt >= start.getTime() && dt <= end.getTime()
    })

    const weekCollectedAmt = weekCollections.reduce(
      (sum, c) => sum + (Number(c.amount_collected) || 0),
      0
    )

    // All-time collections for carry forward & total remaining
    const allLoanCollections = collections.filter((c) => c.loan_id === loan.id)
    const totalCollectedAllTime = allLoanCollections.reduce(
      (sum, c) => sum + (Number(c.amount_collected) || 0),
      0
    )
    const totalPayable = calculateTotalPayable(loan)
    const remainingBalance = Math.max(0, totalPayable - totalCollectedAllTime)

    // Carry-forward pending
    const startDate = new Date(loan.start_date || loan.created_at)
    const diffDays = Math.max(0, Math.floor((start.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    const priorWeeks = Math.max(0, Math.floor(diffDays / 7))
    const expectedPrior = priorWeeks * emi
    const actualPrior = allLoanCollections
      .filter((c) => new Date(c.collection_date).getTime() < start.getTime())
      .reduce((sum, c) => sum + (Number(c.amount_collected) || 0), 0)
    const priorShortfall = Math.max(0, expectedPrior - actualPrior)
    const missedWeeks = emi > 0 && priorShortfall > 0 ? Math.ceil(priorShortfall / emi) : 0
    const previousPending = Math.min(remainingBalance, priorShortfall)

    // Current week pending
    const currentPending = Math.max(0, emi - weekCollectedAmt)
    const totalDue = currentPending + previousPending

    // Customer status
    const dayDate = dayConfigs[batchKey].date
    const dayPassed = new Date().getTime() > dayDate.getTime() + 24 * 60 * 60 * 1000

    let status: 'Paid' | 'Pending' | 'Overdue' = 'Pending'
    if (weekCollectedAmt >= emi || remainingBalance <= 0) {
      status = 'Paid'
    } else if (dayPassed || missedWeeks > 0) {
      status = 'Overdue'
    } else {
      status = 'Pending'
    }

    const customerItem: CustomerBatchItem = {
      loan,
      customerName: loan.customer?.name || 'Customer',
      customerPhone: loan.customer?.phone || '',
      customerIdDisplay:
        loan.customer?.customer_id_display ||
        loan.loan_id_display ||
        loan.customer_id.slice(0, 8),
      photoUrl: loan.customer?.photo_url,
      loanId: loan.loan_id_display || loan.id.slice(0, 8),
      emi,
      previousPending,
      missedWeeks,
      totalDue,
      status,
      collectedAmount: weekCollectedAmt,
      batchDay: batchKey,
      teamLeaderId: leaderId,
      teamLeaderName: leaderName,
    }

    allCustomersMap[loan.id] = customerItem

    // Put into dayLeaderMap
    if (!dayLeaderMap[batchKey][leaderId]) {
      dayLeaderMap[batchKey][leaderId] = {
        teamLeaderId: leaderId,
        teamLeaderName: leaderName,
        customers: [],
      }
    }
    dayLeaderMap[batchKey][leaderId].customers.push(customerItem)
  })

  // Assemble DayBatchData for each day
  const days: Record<DayBatchKey, DayBatchData> = {
    tuesday: null as any,
    thursday: null as any,
    friday: null as any,
  }

  const dayKeys: DayBatchKey[] = ['tuesday', 'thursday', 'friday']

  dayKeys.forEach((key) => {
    const config = dayConfigs[key]
    const leaderRecords = Object.values(dayLeaderMap[key])

    // Convert leader records to LeaderBatchGroup
    const leaders: LeaderBatchGroup[] = leaderRecords
      .map((rec) => {
        const expectedEmi = rec.customers.reduce((s, c) => s + c.emi, 0)
        const totalCarryForward = rec.customers.reduce((s, c) => s + c.previousPending, 0)
        const collectedAmount = rec.customers.reduce((s, c) => s + c.collectedAmount, 0)
        const pendingAmount = Math.max(0, expectedEmi - collectedAmount)
        const denominator = expectedEmi + totalCarryForward > 0 ? expectedEmi + totalCarryForward : expectedEmi
        const rawRate = denominator > 0 ? Math.round((collectedAmount / denominator) * 100) : 0
        const collectionRate = Math.min(100, Math.max(0, rawRate))
        const isOverCollected = rawRate > 100
        const isFullyCollected = collectionRate === 100 || (pendingAmount === 0 && collectedAmount > 0)

        return {
          teamLeaderId: rec.teamLeaderId,
          teamLeaderName: rec.teamLeaderName,
          totalBorrowers: rec.customers.length,
          expectedEmi,
          collectedAmount,
          pendingAmount,
          collectionRate,
          isOverCollected,
          isFullyCollected,
          customers: rec.customers,
        }
      })
      .filter((l) => l.totalBorrowers > 0)

    // Sort leaders by pending amount descending (highest pending first)
    leaders.sort((a, b) => b.pendingAmount - a.pendingAmount || b.expectedEmi - a.expectedEmi)

    const expectedEmi = leaders.reduce((s, l) => s + l.expectedEmi, 0)
    const collectedAmount = leaders.reduce((s, l) => s + l.collectedAmount, 0)
    const pendingAmount = Math.max(0, expectedEmi - collectedAmount)
    const dayCarryForward = leaders.reduce(
      (s, l) => s + l.customers.reduce((cs, c) => cs + c.previousPending, 0),
      0
    )
    const dayDenominator = expectedEmi + dayCarryForward > 0 ? expectedEmi + dayCarryForward : expectedEmi
    const rawDayRate = dayDenominator > 0 ? Math.round((collectedAmount / dayDenominator) * 100) : 0
    const collectionRate = Math.min(100, Math.max(0, rawDayRate))
    const isOverCollected = rawDayRate > 100
    const isFullyCollected = collectionRate === 100 || (pendingAmount === 0 && collectedAmount > 0)
    const borrowersCount = leaders.reduce((s, l) => s + l.totalBorrowers, 0)

    const isToday = weekInfo.isCurrent && config.dateStr === todayIstStr

    let status: 'Today' | 'Upcoming' | 'Completed' | 'Overdue' = 'Upcoming'
    if (isToday) {
      status = 'Today'
    } else if (expectedEmi > 0 && pendingAmount === 0) {
      status = 'Completed'
    } else if (config.dateStr < todayIstStr) {
      status = 'Overdue'
    } else {
      status = 'Upcoming'
    }

    days[key] = {
      key,
      label: config.label,
      date: config.date,
      dateStr: config.dateStr,
      formattedDate: config.formattedDate,
      status,
      isToday,
      leadersCount: leaders.length,
      borrowersCount,
      expectedEmi,
      collectedAmount,
      pendingAmount,
      collectionRate,
      isOverCollected,
      isFullyCollected,
      leaders,
    }
  })

  // Summary across the 3 days (100% exact match)
  const targetWeekEmi =
    days.tuesday.expectedEmi + days.thursday.expectedEmi + days.friday.expectedEmi
  const collectedThisWeek =
    days.tuesday.collectedAmount + days.thursday.collectedAmount + days.friday.collectedAmount
  const pendingBalance =
    days.tuesday.pendingAmount + days.thursday.pendingAmount + days.friday.pendingAmount

  return {
    weekRange: {
      start: weekInfo.start,
      end: weekInfo.end,
      label: weekInfo.label,
      isCurrent: weekInfo.isCurrent,
      weekOffset: weekInfo.weekOffset,
    },
    summary: {
      targetWeekEmi,
      collectedThisWeek,
      pendingBalance,
    },
    days,
    allCustomersMap,
  }
}

/**
 * Custom React Hook for Weekly Batch Hierarchy
 */
export function useWeekBatchData(
  loans: Loan[],
  collections: Collection[],
  employees: Employee[],
  weekOffset: number = 0
) {
  return useMemo(() => {
    return getWeekBatchHierarchy(loans, collections, employees, weekOffset)
  }, [loans, collections, employees, weekOffset])
}

