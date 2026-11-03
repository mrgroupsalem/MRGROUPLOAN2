'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Loan, Employee, Collection } from '@/types'
import { isLoanDueInWeek } from '@/lib/dueSchedule'

export type BatchDay = 'tuesday' | 'thursday' | 'friday'

export interface PendingCustomerItem {
  loanId: string
  loan: Loan
  customerName: string
  customerPhone: string
  customerIdDisplay: string
  teamLeaderId: string
  teamLeaderName: string
  batchDay: BatchDay | string
  weeklyEmi: number
  currentCycleEmi: number
  previousPendingAmount: number
  totalPendingAmount: number
  missedWeeksCount: number
  daysOverdue: number
  status: 'due_today' | 'overdue' | 'pending'
  remainingBalance: number
  totalLoanAmount: number
  totalCollectedSoFar: number
}

export interface TeamLeaderPendingGroup {
  teamLeaderId: string
  teamLeaderName: string
  pendingCount: number
  totalPendingAmount: number
  collectedAmount: number
  targetAmount: number
  collectionRate: number
  customers: PendingCustomerItem[]
}

// Calculate EMI: (Interest Rate × Loan Amount) / 100
export const calculateEMI = (loan: Loan): number => {
  const interestRate = parseFloat(loan.interest_rate || '8.33')
  const loanAmount = Number(loan.amount) || 0
  return (interestRate * loanAmount) / 100
}

// Calculate total payable amount: EMI × Number of Weeks
export const calculateTotalPayable = (loan: Loan): number => {
  const emi = calculateEMI(loan)
  const numberOfWeeks = loan.number_of_weeks || 15
  return emi * numberOfWeeks
}

export const getCurrentWeekRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export const getTodayBatchDay = (): BatchDay | null => {
  const now = new Date()
  const istDateString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  const istDate = new Date(istDateString)
  const day = istDate.getDay() // 0 = Sun, 1 = Mon, 2 = Tue, 4 = Thu, 5 = Fri
  if (day === 2) return 'tuesday'
  if (day === 4) return 'thursday'
  if (day === 5) return 'friday'
  return null
}

/**
 * Shared Carry-Forward and Overdue Calculation function
 * Used by both Dashboard and Collections to guarantee identical numbers.
 */
export function calculatePendingWithCarryForward({
  loan,
  collections,
  pendingDbRecords,
  todayBatch,
  currentWeekStart,
  currentWeekEnd,
}: {
  loan: Loan
  collections: Collection[]
  pendingDbRecords: Record<string, { count: number; emi: number }>
  todayBatch: BatchDay | null
  currentWeekStart: Date
  currentWeekEnd: Date
}): PendingCustomerItem | null {
  if (loan.status !== 'active') return null
  if (!isLoanDueInWeek(loan, currentWeekStart, currentWeekEnd)) return null

  const emi = calculateEMI(loan)
  const totalLoanAmount = calculateTotalPayable(loan)

  const loanCollections = collections.filter((c) => c.loan_id === loan.id)
  const totalCollectedSoFar = loanCollections.reduce(
    (sum, c) => sum + (Number(c.amount_collected) || 0),
    0
  )
  const remainingBalance = Math.max(0, totalLoanAmount - totalCollectedSoFar)

  // If loan has no remaining balance, it is fully paid
  if (remainingBalance <= 0) return null

  // Check if any collection was recorded during the current week window
  const collectedThisWeek = loanCollections.some((c) => {
    const dt = new Date(c.collection_date).getTime()
    return dt >= currentWeekStart.getTime() && dt <= currentWeekEnd.getTime()
  })

  // Calculate elapsed weeks since loan origination (IST)
  const startDate = new Date(loan.start_date || loan.created_at)
  const now = new Date()
  const diffDays = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  const totalTenureWeeks = loan.number_of_weeks || 15
  const elapsedWeeks = Math.min(totalTenureWeeks, Math.max(1, Math.floor(diffDays / 7) + 1))

  // Expected collection up to this week
  const expectedTotalDueToDate = elapsedWeeks * emi
  const shortfallAmount = Math.max(0, expectedTotalDueToDate - totalCollectedSoFar)

  // Check if explicit database record exists in pending_customers
  const dbPending = pendingDbRecords[loan.id]

  let isPending = false
  let missedWeeksCount = 1

  if (dbPending && dbPending.count > 0) {
    isPending = true
    missedWeeksCount = dbPending.count
  } else if (!collectedThisWeek) {
    isPending = true
    if (emi > 0 && shortfallAmount > emi) {
      missedWeeksCount = Math.min(totalTenureWeeks, Math.max(1, Math.ceil(shortfallAmount / emi)))
    } else {
      missedWeeksCount = 1
    }
  }

  if (!isPending) return null

  // Breakdown of Current Cycle vs Previous Overdue Carry-Forward
  const currentCycleEmi = emi
  const previousPendingAmount = missedWeeksCount > 1 ? (missedWeeksCount - 1) * emi : 0
  const totalPendingAmount = Math.min(remainingBalance, currentCycleEmi + previousPendingAmount)

  // Status badge & days overdue
  let status: 'due_today' | 'overdue' | 'pending' = 'pending'
  let daysOverdue = 0

  if (missedWeeksCount > 1) {
    status = 'overdue'
    daysOverdue = (missedWeeksCount - 1) * 7
  } else if (todayBatch && loan.weekly_batch === todayBatch) {
    status = 'due_today'
    daysOverdue = 0
  } else {
    status = 'pending'
    daysOverdue = 2
  }

  const teamLeaderName = loan.team_leader?.name || 'Unassigned Leader'

  return {
    loanId: loan.id,
    loan,
    customerName: loan.customer?.name || loan.customer_id || 'Unknown Customer',
    customerPhone: loan.customer?.phone || '',
    customerIdDisplay: loan.customer?.customer_id_display || loan.customer_id || '',
    teamLeaderId: loan.team_leader_id || 'unassigned',
    teamLeaderName,
    batchDay: loan.weekly_batch || 'tuesday',
    weeklyEmi: emi,
    currentCycleEmi,
    previousPendingAmount,
    totalPendingAmount,
    missedWeeksCount,
    daysOverdue,
    status,
    remainingBalance,
    totalLoanAmount,
    totalCollectedSoFar,
  }
}

export function usePendingCollections() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [pendingDbRecords, setPendingDbRecords] = useState<Record<string, { count: number; emi: number }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [collRes, loansRes, custRes, empRes, pendingRes] = await Promise.all([
        supabase
          .from('collections')
          .select(`*, loan:loans(*), worker:employees(*)`)
          .order('collection_date', { ascending: false }),
        supabase.from('loans').select(`*, team_leader:employees(*)`).eq('status', 'active'),
        supabase.from('customers').select(`*`),
        supabase.from('employees').select(`*`),
        supabase.from('pending_customers').select('loan_id, pending_count, emi_amount'),
      ])

      if (collRes.error) throw collRes.error
      if (loansRes.error) throw loansRes.error
      if (custRes.error) throw custRes.error
      if (empRes.error) throw empRes.error

      setCollections(collRes.data || [])
      setEmployees(empRes.data || [])

      // Join customer records to loans
      const joinedLoans = (loansRes.data || []).map((loan) => {
        const customer = (custRes.data || []).find((c) => c.id === loan.customer_id)
        return { ...loan, customer }
      })
      setLoans(joinedLoans)

      // Map pending_customers table
      const dbMap: Record<string, { count: number; emi: number }> = {}
      if (!pendingRes.error && pendingRes.data) {
        pendingRes.data.forEach((r: any) => {
          if (Number(r.pending_count || 0) > 0) {
            dbMap[r.loan_id] = {
              count: Number(r.pending_count || 0),
              emi: Number(r.emi_amount || 0),
            }
          }
        })
      }
      setPendingDbRecords(dbMap)
      setLastRefreshed(new Date())
      setError(null)
    } catch (err: any) {
      console.error('Error fetching pending collection data:', err)
      setError(err.message || 'Failed to fetch collection data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // BroadcastChannel cross-tab listener
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('collections')
      bc.onmessage = () => {
        fetchData()
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e)
    }

    // Polling fallback
    const interval = setInterval(() => {
      fetchData()
    }, 30000)

    // Supabase Realtime channel
    const channel = supabase
      .channel('collections_carryforward_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_customers' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      if (bc) bc.close()
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  // Compute pending customer list with carry-forward
  const pendingCustomers = useMemo(() => {
    const { start, end } = getCurrentWeekRange()
    const todayBatch = getTodayBatchDay()
    const result: PendingCustomerItem[] = []

    loans.forEach((loan) => {
      const item = calculatePendingWithCarryForward({
        loan,
        collections,
        pendingDbRecords,
        todayBatch,
        currentWeekStart: start,
        currentWeekEnd: end,
      })
      if (item) {
        // Find employee name if not populated
        if (item.teamLeaderName === 'Unassigned Leader') {
          const emp = employees.find((e) => e.id === loan.team_leader_id)
          if (emp) item.teamLeaderName = emp.name
        }
        result.push(item)
      }
    })

    return result
  }, [loans, collections, employees, pendingDbRecords])

  // Group pending customers by Team Leader with carry-forward totals
  const teamLeaderGroups = useMemo(() => {
    const map: Record<string, TeamLeaderPendingGroup> = {}
    const { start, end } = getCurrentWeekRange()

    // Initialize groups from employees
    employees.forEach((emp) => {
      map[emp.id] = {
        teamLeaderId: emp.id,
        teamLeaderName: emp.name,
        pendingCount: 0,
        totalPendingAmount: 0,
        collectedAmount: 0,
        targetAmount: 0,
        collectionRate: 0,
        customers: [],
      }
    })

    map['unassigned'] = {
      teamLeaderId: 'unassigned',
      teamLeaderName: 'Unassigned Leader',
      pendingCount: 0,
      totalPendingAmount: 0,
      collectedAmount: 0,
      targetAmount: 0,
      collectionRate: 0,
      customers: [],
    }

    pendingCustomers.forEach((item) => {
      const leaderId = item.teamLeaderId in map ? item.teamLeaderId : 'unassigned'
      map[leaderId].customers.push(item)
      map[leaderId].pendingCount += 1
      map[leaderId].totalPendingAmount += item.totalPendingAmount
    })

    // Calculate collected amount this week per leader
    collections.forEach((c) => {
      const cDate = new Date(c.collection_date).getTime()
      if (cDate >= start.getTime() && cDate <= end.getTime()) {
        const leaderId = c.worker_id && c.worker_id in map ? c.worker_id : 'unassigned'
        map[leaderId].collectedAmount += Number(c.amount_collected) || 0
      }
    })

    Object.values(map).forEach((group) => {
      group.targetAmount = group.collectedAmount + group.totalPendingAmount
      group.collectionRate =
        group.targetAmount > 0
          ? Math.round((group.collectedAmount / group.targetAmount) * 100)
          : 0
    })

    return Object.values(map)
      .filter((g) => g.pendingCount > 0 || g.collectedAmount > 0)
      .sort((a, b) => b.totalPendingAmount - a.totalPendingAmount)
  }, [employees, pendingCustomers, collections])

  // Summary statistics including carry-forward totals
  const summary = useMemo(() => {
    const totalPendingAmount = pendingCustomers.reduce((sum, p) => sum + p.totalPendingAmount, 0)
    const totalPendingCount = pendingCustomers.length

    const now = new Date()
    const istToday = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const todayCollections = collections.filter((c) => {
      const cDate = c.collection_date ? c.collection_date.split('T')[0] : ''
      return cDate === istToday
    })

    const todayCollectedAmount = todayCollections.reduce(
      (sum, c) => sum + (Number(c.amount_collected) || 0),
      0
    )

    const todayBatch = getTodayBatchDay()
    let todayTargetAmount = 0
    if (todayBatch) {
      loans
        .filter((l) => l.weekly_batch === todayBatch && l.status === 'active')
        .forEach((l) => {
          todayTargetAmount += calculateEMI(l)
        })
    } else {
      todayTargetAmount = todayCollectedAmount + totalPendingAmount
    }

    const collectionProgress =
      todayTargetAmount > 0
        ? Math.min(100, Math.round((todayCollectedAmount / todayTargetAmount) * 100))
        : 0

    return {
      totalPendingAmount,
      totalPendingCount,
      todayCollectedAmount,
      todayTargetAmount,
      collectionProgress,
      todayBatch,
    }
  }, [pendingCustomers, collections, loans])

  return {
    pendingCustomers,
    teamLeaderGroups,
    summary,
    loans,
    collections,
    employees,
    loading,
    error,
    lastRefreshed,
    refetch: fetchData,
  }
}
