'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Loan, Customer, Collection, Employee } from '@/types'
import { calculateEMI, calculateTotalPayable, getCurrentWeekRange, BatchDay } from './usePendingCollections'

export interface TodayLoanItem {
  id: string
  loanIdDisplay?: string
  customerId: string
  customerName: string
  customerPhone: string
  amount: number
  type: 'New' | 'Renewal'
  teamLeaderName: string
  batchDay: BatchDay | string
  createdAt: string
  formattedTime: string
}

export function useDashboardData() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      const [loansRes, custRes, collRes, empRes] = await Promise.all([
        supabase
          .from('loans')
          .select(`*, team_leader:employees(*)`)
          .order('created_at', { ascending: false }),
        supabase.from('customers').select(`*`),
        supabase
          .from('collections')
          .select(`*`)
          .order('collection_date', { ascending: false }),
        supabase.from('employees').select(`*`),
      ])

      if (loansRes.error) throw loansRes.error
      if (custRes.error) throw custRes.error
      if (collRes.error) throw collRes.error
      if (empRes.error) throw empRes.error

      const rawLoans = loansRes.data || []
      const rawCusts = custRes.data || []
      const rawColls = collRes.data || []
      const rawEmps = empRes.data || []

      // Link customers to loans
      const joinedLoans = rawLoans.map((loan) => {
        const customer = rawCusts.find((c) => c.id === loan.customer_id)
        return { ...loan, customer }
      })

      setLoans(joinedLoans)
      setCustomers(rawCusts)
      setCollections(rawColls)
      setEmployees(rawEmps)
      setLastUpdated(new Date())
      setError(null)
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
      setError(err.message || 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()

    // 1. Cross-tab BroadcastChannel listener
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('collections')
      bc.onmessage = () => {
        fetchDashboardData()
      }
    } catch {}

    // 2. Realtime Subscriptions on loans & collections
    const channel = supabase
      .channel('dashboard_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => {
        fetchDashboardData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => {
        fetchDashboardData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchDashboardData()
      })
      .subscribe()

    // 3. Fallback polling
    const interval = setInterval(() => {
      fetchDashboardData()
    }, 30000)

    return () => {
      if (bc) bc.close()
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchDashboardData])

  // New Loans calculations (Today & This Month) with New vs Renewal split
  const newLoansStats = useMemo(() => {
    const now = new Date()
    const istToday = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) // YYYY-MM-DD
    const currentYearMonth = istToday.slice(0, 7) // YYYY-MM

    // Build customer loan frequency map to classify New vs Renewal
    const loansByCustomer: Record<string, Loan[]> = {}
    // Sort oldest first
    const sortedLoans = [...loans].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    sortedLoans.forEach((l) => {
      if (!loansByCustomer[l.customer_id]) loansByCustomer[l.customer_id] = []
      loansByCustomer[l.customer_id].push(l)
    })

    const isRenewalLoan = (loan: Loan): boolean => {
      const custLoans = loansByCustomer[loan.customer_id] || []
      // If customer has any loan created prior to this one, it is a renewal/repeat loan
      const currentIdx = custLoans.findIndex((l) => l.id === loan.id)
      return currentIdx > 0
    }

    const todayLoansList: TodayLoanItem[] = []
    let todayNewCount = 0
    let todayRenewalCount = 0
    let monthCount = 0

    loans.forEach((loan) => {
      const createdDateIST = new Date(loan.created_at).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      })
      const isToday = createdDateIST === istToday
      const isMonth = createdDateIST.startsWith(currentYearMonth)

      if (isMonth) monthCount += 1

      if (isToday) {
        const isRenewal = isRenewalLoan(loan)
        if (isRenewal) todayRenewalCount += 1
        else todayNewCount += 1

        const emp = employees.find((e) => e.id === loan.team_leader_id)
        const teamLeaderName = emp?.name || loan.team_leader?.name || 'Unassigned'
        const timeStr = new Date(loan.created_at).toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
        })

        todayLoansList.push({
          id: loan.id,
          loanIdDisplay: loan.loan_id_display,
          customerId: loan.customer_id,
          customerName: loan.customer?.name || 'Customer',
          customerPhone: loan.customer?.phone || '',
          amount: Number(loan.amount) || 0,
          type: isRenewal ? 'Renewal' : 'New',
          teamLeaderName,
          batchDay: loan.weekly_batch || 'tuesday',
          createdAt: loan.created_at,
          formattedTime: timeStr,
        })
      }
    })

    return {
      todayTotalCount: todayNewCount + todayRenewalCount,
      todayNewCount,
      todayRenewalCount,
      monthCount,
      todayLoansList,
      isRenewalLoan,
    }
  }, [loans, employees])

  // Total Customers breakdown
  const customersStats = useMemo(() => {
    const totalCount = customers.length
    const activeCustomerIds = new Set(
      loans.filter((l) => l.status === 'active').map((l) => l.customer_id)
    )
    const activeCount = activeCustomerIds.size

    return {
      totalCount,
      activeCount,
    }
  }, [customers, loans])

  // Total Loans breakdown
  const loansBreakdown = useMemo(() => {
    let active = 0
    let closed = 0
    let emergency = 0

    loans.forEach((l: any) => {
      if (l.loan_type === 'emergency' || l.loan_purpose?.toLowerCase().includes('emergency')) {
        emergency += 1
      }
      if (l.status === 'active') active += 1
      else if (l.status === 'closed') closed += 1
    })

    return {
      total: loans.length,
      active,
      closed,
      emergency,
    }
  }, [loans])

  // Financial Stats: Disbursed, Profit, and Outstanding Balance
  const financialStats = useMemo(() => {
    let totalDisbursed = 0
    let globalRealizedProfit = 0
    let totalOutstandingBalance = 0

    loans.forEach((loan) => {
      totalDisbursed += Number(loan.amount) || 0
      const weeklyEmi = calculateEMI(loan)
      const totalAmount = calculateTotalPayable(loan)
      const loanCollections = collections.filter((c) => c.loan_id === loan.id)
      const actualPaid = loanCollections.reduce(
        (sum, c) => sum + (Number(c.amount_collected) || 0),
        0
      )

      if (loan.status === 'closed' || loan.status === 'active') {
        const weeksPaid = weeklyEmi > 0 ? Math.floor(actualPaid / weeklyEmi) : 0
        const profitPerWeek = Math.round(
          (totalAmount - loan.amount) / (loan.number_of_weeks || 15)
        )
        globalRealizedProfit += profitPerWeek * weeksPaid

        if (loan.status === 'active') {
          totalOutstandingBalance += Math.max(0, totalAmount - actualPaid)
        }
      }
    })

    return {
      totalDisbursed,
      totalProfit: globalRealizedProfit,
      totalOutstandingBalance,
    }
  }, [loans, collections])

  // Batch details (Tuesday, Thursday, Friday)
  const batchDetails = useMemo(() => {
    const { start, end } = getCurrentWeekRange()
    const batches: Record<BatchDay, {
      id: BatchDay
      name: string
      day: string
      totalEmi: number
      activeLoans: number
      collectedThisWeek: number
      collectedCount: number
      pendingCount: number
    }> = {
      tuesday: {
        id: 'tuesday',
        name: 'Tuesday Batch',
        day: 'Tuesday',
        totalEmi: 0,
        activeLoans: 0,
        collectedThisWeek: 0,
        collectedCount: 0,
        pendingCount: 0,
      },
      thursday: {
        id: 'thursday',
        name: 'Thursday Batch',
        day: 'Thursday',
        totalEmi: 0,
        activeLoans: 0,
        collectedThisWeek: 0,
        collectedCount: 0,
        pendingCount: 0,
      },
      friday: {
        id: 'friday',
        name: 'Friday Batch',
        day: 'Friday',
        totalEmi: 0,
        activeLoans: 0,
        collectedThisWeek: 0,
        collectedCount: 0,
        pendingCount: 0,
      },
    }

    loans.forEach((l) => {
      if (l.status !== 'active') return
      const bDay = l.weekly_batch as BatchDay
      if (bDay && batches[bDay]) {
        const emi = calculateEMI(l)
        batches[bDay].totalEmi += emi
        batches[bDay].activeLoans += 1

        const hasWeekCol = collections.some((c) => {
          if (c.loan_id !== l.id) return false
          const ts = new Date(c.collection_date).getTime()
          return ts >= start.getTime() && ts <= end.getTime()
        })

        if (hasWeekCol) {
          batches[bDay].collectedCount += 1
        } else {
          batches[bDay].pendingCount += 1
        }
      }
    })

    collections.forEach((c) => {
      const ts = new Date(c.collection_date).getTime()
      if (ts >= start.getTime() && ts <= end.getTime()) {
        const loan = loans.find((l) => l.id === c.loan_id)
        const bDay = loan?.weekly_batch as BatchDay
        if (bDay && batches[bDay]) {
          batches[bDay].collectedThisWeek += Number(c.amount_collected) || 0
        }
      }
    })

    return Object.values(batches)
  }, [loans, collections])

  // Trend Chart Data (Last 6 Weeks)
  const chartTrends = useMemo(() => {
    const weeks: { weekLabel: string; newLoans: number; renewals: number; disbursed: number }[] = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - i * 7 - 6)
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() - i * 7)
      weekEnd.setHours(23, 59, 59, 999)

      const label = `W-${5 - i === 0 ? 'Current' : 5 - i + 'w ago'}`
      let newCount = 0
      let renewalCount = 0
      let disbursedAmount = 0

      loans.forEach((l) => {
        const lDate = new Date(l.created_at).getTime()
        if (lDate >= weekStart.getTime() && lDate <= weekEnd.getTime()) {
          disbursedAmount += Number(l.amount) || 0
          if (newLoansStats.isRenewalLoan(l)) renewalCount += 1
          else newCount += 1
        }
      })

      weeks.push({
        weekLabel: label,
        newLoans: newCount,
        renewals: renewalCount,
        disbursed: disbursedAmount,
      })
    }

    return weeks
  }, [loans, newLoansStats])

  return {
    loans,
    customers,
    collections,
    employees,
    loading,
    error,
    lastUpdated,
    newLoansStats,
    customersStats,
    loansBreakdown,
    financialStats,
    batchDetails,
    chartTrends,
    refetch: fetchDashboardData,
  }
}
