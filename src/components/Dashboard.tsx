'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'
import {
  TrendingUp,
  Search,
  Bell,
  HelpCircle,
  MoreHorizontal,
  Filter,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  X,
  Eye,
  Edit,
  Trash2,
  Download,
  Plus
} from 'lucide-react'
import { DashboardStats, ChartData, WeeklyBatch, Loan, Employee, Collection } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { splitCustomerNames } from '@/lib/customerIdGenerator'
import { exportDashboardStats, exportWeeklyBatches, exportBatchDetails } from '@/lib/exportUtils'
import { supabase } from '@/lib/supabase'

// Initialize with empty data - ready for real database integration
const emptyStats: DashboardStats = {
  newLoans: 0,
  activeLoans: 0,
  closedLoans: 0,
  openLoanApplications: 0,
  newLoanApplications: 0,
  totalSanctionedAmount: 0,
  applicantsWithUnpaidShortfall: 0,
  totalShortfallAmount: 0,
  todayCollection: 0,
  totalDisbursed: 0,
  activeSecurities: 0,
  totalWriteOff: 0,
  totalRepayment: 0,
}

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [loans, setLoans] = useState<Loan[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [weeklyBatches, setWeeklyBatches] = useState<WeeklyBatch[]>([])
  const [selectedBatch, setSelectedBatch] = useState<WeeklyBatch | null>(null)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [newLoanTrendData, setNewLoanTrendData] = useState<ChartData[]>([])
  const [disbursementTrendData, setDisbursementTrendData] = useState<ChartData[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Loan | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customerToEdit, setCustomerToEdit] = useState<Loan | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Loan | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [workerFilter, setWorkerFilter] = useState('all')
  const [isSyncing, setIsSyncing] = useState(false)
  const [showPendingModal, setShowPendingModal] = useState(false)
  const [selectedPendingIds, setSelectedPendingIds] = useState<Record<string, boolean>>({})
  const [showBatchCollectModal, setShowBatchCollectModal] = useState(false)
  const [selectedBatchCollectIds, setSelectedBatchCollectIds] = useState<Record<string, boolean>>({})
  const [recentPendingFromEvent, setRecentPendingFromEvent] = useState<{ loanId: string, customerId: string, weeklyEmi: number }[]>([])
  const [isCollectingPending, setIsCollectingPending] = useState(false)
  const [pendingCustomersFromDB, setPendingCustomersFromDB] = useState<Record<string, { count: number, emi: number }>>({})
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [globalSearchTerm, setGlobalSearchTerm] = useState('')
  const [chartTimeRange, setChartTimeRange] = useState('6M')
  const [selectedChartType, setSelectedChartType] = useState<'bar' | 'line'>('bar')
  const [chartAnimation, setChartAnimation] = useState(true)
  const [batchCollectionNotifications, setBatchCollectionNotifications] = useState<Array<{
    id: string
    batch: string
    collectedCount: number
    pendingCount: number
    timestamp: string
  }>>([])

  // Force refresh pending customers from database
  const refreshPendingCustomers = async () => {
    try {
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_customers')
        .select('loan_id, pending_count, emi_amount')

      if (pendingError) {
        console.error('Error refreshing pending customers:', pendingError)
        // Set empty state on error
        setPendingCustomersFromDB({})
      } else {
        const map: Record<string, { count: number, emi: number }> = {}
          ; (pendingData || []).forEach(r => {
            // Only add customers with pending count > 0 (same logic as Collections page)
            if (Number(r.pending_count || 0) > 0) {
              map[r.loan_id] = { count: Number(r.pending_count || 0), emi: Number(r.emi_amount || 0) }
            }
          })
        setPendingCustomersFromDB(map)
        console.log('Force refreshed pending customers from database:', map)
      }
    } catch (error) {
      console.error('Failed to refresh pending customers:', error)
    }
  }



  // Load loans, employees and collections from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load loans with related data
        const { data: loansData, error: loansError } = await supabase
          .from('loans')
          .select(`
            *,
            team_leader:employees(*)
          `)

        if (loansError) {
          console.error('Error loading loans:', loansError)
        } else {
          // Manually join customer data - customer_id is now a UUID
          const loansWithCustomers = await Promise.all((loansData || []).map(async (loan) => {
            // Get customer by UUID (customer_id in loans table is now UUID)
            const { data: customerData } = await supabase
              .from('customers')
              .select('*')
              .eq('id', loan.customer_id)
              .single()

            // If not found, create a placeholder customer object
            if (!customerData) {
              console.warn(`Customer not found for loan ${loan.id}, customer_id: ${loan.customer_id}`)
              return {
                ...loan,
                customer: {
                  id: loan.customer_id,
                  name: `Customer ${loan.customer_id}`,
                  phone: 'N/A',
                  address: 'Address not available',
                  customer_id_display: loan.customer_id
                }
              }
            }

            return {
              ...loan,
              customer: customerData
            }
          }))

          setLoans(loansWithCustomers)
          console.log('Loaded loans with customers:', loansWithCustomers.length)
        }

        // Load employees
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('*')

        if (employeesError) {
          console.error('Error loading employees:', employeesError)
        } else {
          setEmployees(employeesData || [])
        }

        // Load collections with related loan to know weekly_batch
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select(`
            *,
            loan:loans(*),
            worker:employees(*)
          `)

        if (collectionsError) {
          console.error('Error loading collections:', collectionsError)
        } else {
          // Manually join customer data for collections - use customer_id UUID
          const collectionsWithCustomers = await Promise.all((collectionsData || []).map(async (collection) => {
            const { data: customerData } = await supabase
              .from('customers')
              .select('*')
              .eq('id', collection.customer_id)
              .single()

            return {
              ...collection,
              customer: customerData || null
            }
          }))

          setCollections(collectionsWithCustomers)
          console.log('Loaded collections with customers:', collectionsWithCustomers.length)
        }

        // Load pending customers from database (all pending customers)
        const { data: pendingData, error: pendingError } = await supabase
          .from('pending_customers')
          .select('loan_id, pending_count, emi_amount')

        if (pendingError) {
          console.error('Error loading pending customers:', pendingError)
          // Set empty state on error
          setPendingCustomersFromDB({})
        } else {
          const map: Record<string, { count: number, emi: number }> = {}
            ; (pendingData || []).forEach(r => {
              // Only add customers with pending count > 0 (same logic as Collections page)
              if (Number(r.pending_count || 0) > 0) {
                map[r.loan_id] = { count: Number(r.pending_count || 0), emi: Number(r.emi_amount || 0) }
              }
            })
          setPendingCustomersFromDB(map)
          console.log('Loaded pending customers from database:', map)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    loadData()

    // Live updates via BroadcastChannel from Collections page
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('collections')
      bc.onmessage = (ev) => {
        if (ev?.data?.type === 'collections-updated') {
          // Optional: could use ev.data.batch / ev.data.pending for optimized updates
          setIsSyncing(true)
          if (Array.isArray(ev.data?.pending)) {
            setRecentPendingFromEvent(ev.data.pending)
          }
          loadData().finally(() => {
            setIsSyncing(false)
            setRecentPendingFromEvent([])
          })
        } else if (ev?.data?.type === 'pending-customer-collected') {
          // Handle pending customer collection from Collections page
          console.log('Pending customer collected in Collections:', ev.data.customerName, ev.data.collectedAmount)
          setIsSyncing(true)
          // Refresh pending customers specifically
          refreshPendingCustomers()
          loadData().finally(() => setIsSyncing(false))
        } else if (ev?.data?.type === 'pending-counts-updated') {
          // Handle pending counts update from Collections page
          console.log('Received pending counts update from Collections:', ev.data.counts)
          if (ev.data.counts) {
            setPendingCustomersFromDB(ev.data.counts)
            console.log('Updated Dashboard pending customers from Collections')
          }
        } else if (ev?.data?.type === 'pending-session-closed') {
          // Handle batch session end from Collections page
          console.log('Batch session closed in Collections, refreshing pending customers')
          setIsSyncing(true)
          // Refresh pending customers specifically
          refreshPendingCustomers()
          loadData().finally(() => setIsSyncing(false))
        } else if (ev?.data?.type === 'batch-collection-updated') {
          // Handle batch collection update from Collections page
          console.log('Batch collection updated in Collections:', ev.data.batch, 'Collected:', ev.data.collectedCount, 'Pending:', ev.data.pendingCount)

          // Add notification
          const notification = {
            id: Date.now().toString(),
            batch: ev.data.batch,
            collectedCount: ev.data.collectedCount,
            pendingCount: ev.data.pendingCount,
            timestamp: ev.data.timestamp
          }
          setBatchCollectionNotifications(prev => [notification, ...prev.slice(0, 9)]) // Keep last 10 notifications

          setIsSyncing(true)
          // Refresh all data to update weekly batches and pending customers
          refreshPendingCustomers()
          loadData().finally(() => setIsSyncing(false))
        } else if (ev?.data?.type === 'individual-collection-updated') {
          // Handle individual collection update from Collections page
          console.log('Individual collection updated in Collections:', ev.data.customerName, 'Amount:', ev.data.amount)

          setIsSyncing(true)
          // Refresh all data to update collections and stats
          loadData().finally(() => setIsSyncing(false))
        }
      }
    } catch { }

    // Periodic refresh fallback
    const interval = setInterval(loadData, 2000)

    return () => {
      if (bc) try { bc.close() } catch { }
      clearInterval(interval)
    }
  }, [])

  // Update stats based on loans
  useEffect(() => {
    const updateStats = () => {
      const newStats: DashboardStats = {
        newLoans: loans.filter(loan => {
          const loanDate = new Date(loan.created_at)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          return loanDate >= thirtyDaysAgo
        }).length,
        activeLoans: loans.filter(loan => loan.status === 'active').length,
        closedLoans: loans.filter(loan => loan.status === 'closed').length,
        openLoanApplications: loans.filter(loan => loan.status === 'pending').length,
        newLoanApplications: loans.filter(loan => {
          const loanDate = new Date(loan.created_at)
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          return loanDate >= sevenDaysAgo
        }).length,
        totalSanctionedAmount: loans.reduce((sum, loan) => sum + loan.amount, 0),
        applicantsWithUnpaidShortfall: 0,
        totalShortfallAmount: 0,
        todayCollection: 0, // Will be calculated separately
        totalDisbursed: loans.reduce((sum, loan) => sum + loan.amount, 0),
        activeSecurities: loans.filter(loan => loan.status === 'active').length,
        totalWriteOff: 0,
        totalRepayment: 0 // Will be calculated from repayment data
      }
      setStats(newStats)
    }
    updateStats()
  }, [loans])

  // Calculate today's expected collection amount based on current day's batch
  useEffect(() => {
    const calculateAdvancedStats = () => {
      // Get today's day of the week (0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday)
      const today = new Date();
      const dayOfWeek = today.getDay();

      // Map numeric day to batch day
      let currentBatchDay: 'tuesday' | 'thursday' | 'friday' | null = null;
      if (dayOfWeek === 2) { // Tuesday
        currentBatchDay = 'tuesday';
      } else if (dayOfWeek === 4) { // Thursday
        currentBatchDay = 'thursday';
      } else if (dayOfWeek === 5) { // Friday
        currentBatchDay = 'friday';
      }

      let todayExpectedCollection = 0;
      let todayExpectedProfit = 0;

      if (currentBatchDay) {
        // Find all active loans assigned to today's batch
        const activeLoansInTodayBatch = loans.filter(loan =>
          loan.weekly_batch === currentBatchDay &&
          loan.status === 'active'
        );

        // Calculate the total expected EMI and profit for today's batch
        activeLoansInTodayBatch.forEach(loan => {
          const weeklyEmi = computeWeeklyEmi(loan);
          const totalAmount = calculateTotalPayable(loan);
          const profitPerWeek = Math.round((totalAmount - loan.amount) / (loan.number_of_weeks || 15));
          
          todayExpectedCollection += weeklyEmi;
          todayExpectedProfit += profitPerWeek;
        });
      }

      // Calculate globally realized profit and outstanding balance
      let globalRealizedProfit = 0;
      let globalOutstandingBalance = 0;

      loans.forEach(loan => {
        if (loan.status === 'closed' || loan.status === 'active') {
          const weeklyEMI = computeWeeklyEmi(loan);
          const totalAmount = calculateTotalPayable(loan);
          const loanCollections = collections.filter(c => c.loan_id === loan.id);
          const actualPaidAmount = loanCollections.reduce((s, c) => s + c.amount_collected, 0);
          
          const weeksPaid = Math.floor(actualPaidAmount / weeklyEMI);
          const profitPerWeek = Math.round((totalAmount - loan.amount) / (loan.number_of_weeks || 15));
          
          globalRealizedProfit += (profitPerWeek * weeksPaid);
          
          if (loan.status === 'active') {
            globalOutstandingBalance += Math.max(0, totalAmount - actualPaidAmount);
          }
        }
      });

      // Calculate distinct active customers
      const activeCustomers = new Set(loans.filter(l => l.status === 'active').map(l => l.customer_id)).size;

      setStats(prevStats => ({
        ...prevStats,
        todayCollection: todayExpectedCollection,
        todayProfit: todayExpectedProfit,
        totalProfit: globalRealizedProfit,
        totalOutstandingBalance: globalOutstandingBalance,
        activeCustomers: activeCustomers
      }));
    };

    calculateAdvancedStats();
  }, [loans, collections]);

  // Generate weekly batches based on collections recorded for the current week
  useEffect(() => {
    const generateWeeklyBatches = () => {
      const batches: WeeklyBatch[] = [
        {
          id: 'tuesday',
          day: 'tuesday',
          name: 'Tuesday Batch',
          total_collection: 0,
          customer_count: 0,
          target_amount: 100000,
          completion_percentage: 0,
          last_collection_date: '',
          next_collection_date: getNextTuesday(),
          status: 'active'
        },
        {
          id: 'thursday',
          day: 'thursday',
          name: 'Thursday Batch',
          total_collection: 0,
          customer_count: 0,
          target_amount: 100000,
          completion_percentage: 0,
          last_collection_date: '',
          next_collection_date: getNextThursday(),
          status: 'active'
        },
        {
          id: 'friday',
          day: 'friday',
          name: 'Friday Batch',
          total_collection: 0,
          customer_count: 0,
          target_amount: 100000,
          completion_percentage: 0,
          last_collection_date: '',
          next_collection_date: getNextFriday(),
          status: 'active'
        }
      ]

      // Determine current week range (last 7 days including today)
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - 6)

      // Map loanId -> weekly_batch for quick lookup
      const loanIdToBatch: Record<string, 'tuesday' | 'thursday' | 'friday' | undefined> = {}
      loans.forEach(l => { if (l.id) loanIdToBatch[l.id] = l.weekly_batch })

      // Unique customer tracking per batch for this week
      const batchCustomerSets: Record<string, Set<string>> = {
        tuesday: new Set<string>(),
        thursday: new Set<string>(),
        friday: new Set<string>()
      }

      // Aggregate collections into batches for the current week
      collections.forEach(col => {
        const colDate = parseDateOnly(col.collection_date as any)
        if (colDate >= start && colDate <= end) {
          const batchDay = loanIdToBatch[col.loan_id]
          if (!batchDay) return
          const batch = batches.find(b => b.day === batchDay)
          if (!batch) return
          batch.total_collection += Number(col.amount_collected || 0)
          batch.last_collection_date = colDate.toISOString().split('T')[0]
          if (col.customer_id) batchCustomerSets[batchDay].add(col.customer_id)
        }
      })

      // Fill customer_count and completion_percentage
      batches.forEach(b => {
        // Count all active loans assigned to this batch, not just those with collections this week
        const batchLoans = loans.filter(loan =>
          loan.weekly_batch === b.day &&
          loan.status === 'active'
        )
        b.customer_count = batchLoans.length

        // Calculate total weekly EMI for this batch using the same logic as calculateWeeklyEMI
        const totalWeeklyEMI = batchLoans.reduce((sum, loan) => {
          const weeklyEMI = computeWeeklyEmi(loan)
          return sum + weeklyEMI
        }, 0)

        // Update total_collection to show expected weekly collection amount
        b.total_collection = totalWeeklyEMI
        b.completion_percentage = (b.total_collection / b.target_amount) * 100

        // Debug logging
        console.log(`Batch ${b.day}:`, {
          totalLoans: loans.length,
          batchLoans: batchLoans.length,
          customerCount: b.customer_count,
          totalWeeklyEMI: totalWeeklyEMI,
          loans: batchLoans.map(l => ({ id: l.id, weekly_batch: l.weekly_batch, status: l.status, customer: l.customer?.name }))
        })
      })

      setWeeklyBatches(batches)
    }

    generateWeeklyBatches()
  }, [loans, collections])

  // Generate chart data from loans (weekly buckets, last 8 weeks)
  useEffect(() => {
    const generateChartData = () => {
      const getWeekStart = (d: Date) => {
        const date = new Date(d)
        const day = date.getDay() // 0=Sun, 1=Mon, ...
        const diff = (day + 6) % 7 // shift so Monday is week start
        date.setDate(date.getDate() - diff)
        date.setHours(0, 0, 0, 0)
        return date
      }
      // Build last 8 week starts (oldest -> newest)
      const thisWeekStart = getWeekStart(new Date())
      const weekStarts: Date[] = []
      for (let i = 7; i >= 0; i--) {
        const ws = new Date(thisWeekStart)
        ws.setDate(thisWeekStart.getDate() - i * 7)
        weekStarts.push(ws)
      }

      const formatWeekLabel = (ws: Date) => {
        return `Week of ${ws.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
      }

      const newLoanData: ChartData[] = weekStarts.map((ws) => {
        const we = new Date(ws)
        we.setDate(ws.getDate() + 6)
        we.setHours(23, 59, 59, 999)
        const count = loans.filter(l => {
          const ld = new Date(l.created_at)
          return ld >= ws && ld <= we
        }).length
        return { date: formatWeekLabel(ws), value: count }
      })

      // Disbursement is based on actual collections in the week, not loan creation
      const disbursementData: ChartData[] = weekStarts.map((ws) => {
        const we = new Date(ws)
        we.setDate(ws.getDate() + 6)
        we.setHours(23, 59, 59, 999)
        const total = collections.reduce((sum, c) => {
          const cd = parseDateOnly(c.collection_date as any)
          return cd >= ws && cd <= we ? sum + Number(c.amount_collected || 0) : sum
        }, 0)
        return { date: formatWeekLabel(ws), value: total }
      })

      setNewLoanTrendData(newLoanData)
      setDisbursementTrendData(disbursementData)
    }

    generateChartData()
  }, [loans])

  const getNextTuesday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilTuesday = (2 - dayOfWeek + 7) % 7
    const nextTuesday = new Date(today)
    nextTuesday.setDate(today.getDate() + daysUntilTuesday)
    return nextTuesday.toISOString().split('T')[0]
  }

  const getNextThursday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7
    const nextThursday = new Date(today)
    nextThursday.setDate(today.getDate() + daysUntilThursday)
    return nextThursday.toISOString().split('T')[0]
  }

  const getNextFriday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7
    const nextFriday = new Date(today)
    nextFriday.setDate(today.getDate() + daysUntilFriday)
    return nextFriday.toISOString().split('T')[0]
  }

  // Helpers for current week window
  const getCurrentWeekRange = () => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  // Safely parse date-only (YYYY-MM-DD) values as local dates
  function parseDateOnly(value: string | Date) {
    if (value instanceof Date) return value
    if (!value) return new Date('1970-01-01')
    const raw = String(value)
    const datePart = raw.includes('T') ? raw.slice(0, 10) : raw
    const parts = datePart.split('-')
    if (parts.length === 3) {
      const y = Number(parts[0])
      const m = Number(parts[1]) - 1
      const d = Number(parts[2])
      return new Date(y, m, d)
    }
    return new Date(datePart)
  }

  // EMI calculation: EMI = (Interest Rate × Loan Amount) / 100
  const calculateEMI = (loan: Loan): number => {
    const interestRate = parseFloat(loan.interest_rate || '8.33')
    const loanAmount = Number(loan.amount) || 0
    return (interestRate * loanAmount) / 100
  }

  // Calculate total payable amount: EMI × Number of Weeks
  const calculateTotalPayable = (loan: Loan): number => {
    const emi = calculateEMI(loan)
    const numberOfWeeks = loan.number_of_weeks || 15
    return emi * numberOfWeeks
  }

  // Compute weekly EMI: Same as Total Interest (EMI)
  const computeWeeklyEmi = (loan: Loan) => {
    const emi = calculateEMI(loan)
    return emi
  }


  // Determine pending customers for the current week (no collection recorded in current week)
  const getPendingThisWeek = () => {
    const { start, end } = getCurrentWeekRange()
    const byId: Record<string, { loan: Loan, weeklyEmi: number }> = {}
    loans.forEach(loan => {
      if (loan.status && loan.status !== 'active') return
      const weeklyEmi = computeWeeklyEmi(loan)
      // check if any collection exists for this loan in current week
      const hasThisWeekCollection = collections.some(c => {
        if (c.loan_id !== loan.id) return false
        const d = parseDateOnly(c.collection_date as any)
        return d >= start && d <= end
      })
      if (!hasThisWeekCollection) {
        byId[loan.id] = { loan, weeklyEmi }
      }
    })
    return Object.values(byId)
  }

  const pendingList = getPendingThisWeek()
  const getCustomerNameByLoanId = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId)
    return loan?.customer?.name || loan?.customer_id || 'Unknown'
  }
  // Merge computed pending with recent event-based pending and database pending customers
  const mergedPendingMap: Record<string, { loan: Loan, weeklyEmi: number, fromEvent?: boolean, fromDB?: boolean, count?: number }> = {}

  // ONLY show database pending customers (from Collections page) - no computed pending
  // Only process if we have database pending customers
  if (Object.keys(pendingCustomersFromDB).length > 0) {
    Object.entries(pendingCustomersFromDB).forEach(([loanId, data]) => {
      const loan = loans.find(l => l.id === loanId)
      if (loan && data.count > 0) {
        mergedPendingMap[loanId] = {
          loan,
          weeklyEmi: data.emi || computeWeeklyEmi(loan),
          fromDB: true,
          count: data.count
        }
      }
    })
  }

  // Add recent event-based pending (unchecked in current session) - only if not in database
  recentPendingFromEvent.forEach(p => {
    const loan = loans.find(l => l.id === p.loanId)
    if (loan && !mergedPendingMap[p.loanId]) { // Only add if not already in database
      mergedPendingMap[p.loanId] = { loan, weeklyEmi: p.weeklyEmi, fromEvent: true }
    }
  })

  // DO NOT add regular pending customers (missed this week) - only show actual unchecked customers from Collections

  const mergedPendingList = Object.values(mergedPendingMap)
  const effectivePendingCount = mergedPendingList.length
  const effectivePendingTotal = mergedPendingList.reduce((sum, p) => sum + (p.weeklyEmi * (p.count || 1)), 0)

  // Debug logging to ensure only database pending customers are shown
  console.log('Dashboard pending customers:', {
    fromDatabase: Object.keys(pendingCustomersFromDB).length,
    fromEvents: recentPendingFromEvent.length,
    computedPending: pendingList.length,
    finalDisplay: effectivePendingCount,
    databaseCustomers: Object.keys(pendingCustomersFromDB),
    finalCustomers: mergedPendingList.map(p => ({ name: p.loan.customer?.name, fromDB: p.fromDB, fromEvent: p.fromEvent }))
  })

  const toggleSelectAllPending = () => {
    const allIds = mergedPendingList.map(p => p.loan.id)
    if (Object.keys(selectedPendingIds).length === allIds.length) {
      setSelectedPendingIds({})
    } else {
      const map: Record<string, boolean> = {}
      allIds.forEach(id => { map[id] = true })
      setSelectedPendingIds(map)
    }
  }

  const toggleSelectPending = (loanId: string) => {
    setSelectedPendingIds(prev => ({ ...prev, [loanId]: !prev[loanId] }))
  }

  // Helper function to get customer UUID by customer_id_display
  const getCustomerUUID = async (customerIdDisplay: string): Promise<string | undefined> => {
    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('customer_id_display', customerIdDisplay)
        .single()

      return customerData?.id || undefined
    } catch (error) {
      console.error('Error fetching customer UUID:', error)
      return undefined
    }
  }

  const handleIndividualCollection = async (loanId: string) => {
    const pendingCustomer = mergedPendingList.find(p => p.loan.id === loanId)
    if (!pendingCustomer) return

    const weeklyEmi = Math.round(pendingCustomer.weeklyEmi)
    const count = pendingCustomer.count || 1
    const totalAmount = weeklyEmi * count

    // Confirm collection
    const confirmMessage = `Confirm Collection:

Customer: ${pendingCustomer.loan.customer?.name || pendingCustomer.loan.customer_id}
Amount: ${formatCurrency(totalAmount)}
Count: ${count} × ${formatCurrency(weeklyEmi)}

This will process the collection for this customer.`
    if (!confirm(confirmMessage)) {
      return
    }

    const today = new Date().toISOString().split('T')[0]

    // Get customer UUID
    let customerUUID = pendingCustomer.loan.customer?.id
    if (!customerUUID) {
      customerUUID = await getCustomerUUID(pendingCustomer.loan.customer_id)
    }

    if (!customerUUID) {
      alert('Error: Could not find customer UUID. Please try again.')
      return
    }

    // Calculate remaining balance using consistent EMI calculation
    const loanTotalAmount = calculateTotalPayable(pendingCustomer.loan)
    const collectedSoFar = collections
      .filter(c => c.loan_id === loanId)
      .reduce((s, c) => s + (Number(c.amount_collected) || 0), 0)
    const remainingBalance = Math.max(0, loanTotalAmount - collectedSoFar - totalAmount)

    const collectionData = {
      loan_id: loanId,
      customer_id: customerUUID,
      worker_id: pendingCustomer.loan.team_leader_id || null,
      amount_collected: totalAmount,
      remaining_balance: remainingBalance,
      status: 'completed',
      collection_date: today,
      notes: `Individual collection - ${pendingCustomer.loan.customer?.name || pendingCustomer.loan.customer_id}${count > 1 ? ` (COUNT = ${count})` : ''}`
    }

    try {
      const { data: insertedCollection, error } = await supabase
        .from('collections')
        .insert(collectionData)
        .select('id, loan_id, customer_id, amount_collected, collection_date, remaining_balance')
        .single()

      if (error) {
        console.error('Error inserting collection:', error)
        alert(`Error collecting amount: ${error.message}`)
        return
      }

      // Check if loan should be closed
      if (remainingBalance <= 0) {
        const { error: closeError } = await supabase
          .from('loans')
          .update({ status: 'closed' })
          .eq('id', loanId)

        if (closeError) {
          console.error('Error closing loan:', closeError)
        } else {
          console.log(`Loan ${loanId} closed - customer has paid full amount`)
        }
      }

      // Refresh data
      const [collectionsResult, pendingResult] = await Promise.all([
        supabase.from('collections').select(`*, customer:customers(*), loan:loans(*), worker:employees(*)`),
        supabase.from('pending_customers').select('loan_id, pending_count, emi_amount, checked').eq('checked', false)
      ])

      if (!collectionsResult.error) {
        setCollections(collectionsResult.data || [])
      }

      if (!pendingResult.error) {
        const map: Record<string, { count: number, emi: number }> = {}
          ; (pendingResult.data || []).forEach((r: any) => {
            if (!r.checked) {
              map[r.loan_id] = { count: Number(r.pending_count || 0), emi: Number(r.emi_amount || 0) }
            }
          })
        setPendingCustomersFromDB(map)
      }

      alert(`Collection completed successfully!\nCustomer: ${pendingCustomer.loan.customer?.name || pendingCustomer.loan.customer_id}\nAmount: ${formatCurrency(totalAmount)}`)

    } catch (error) {
      console.error('Error processing individual collection:', error)
      alert('Error processing collection. Please try again.')
    }
  }

  const handleCollectForSelected = async () => {
    if (!mergedPendingList.length) return

    const selectedPending = mergedPendingList.filter(p => selectedPendingIds[p.loan.id])
    if (selectedPending.length === 0) {
      alert('Please select at least one customer to collect from')
      return
    }

    // Confirm collection
    const totalAmount = selectedPending.reduce((sum, p) => {
      const weeklyEmi = Math.round(p.weeklyEmi)
      const count = p.count || 1
      return sum + (weeklyEmi * count)
    }, 0)

    const confirmMessage = `Confirm Collection:

Selected Customers: ${selectedPending.length}
Total Amount: ${formatCurrency(totalAmount)}

This will process collections for the selected customers.`
    if (!confirm(confirmMessage)) {
      return
    }

    const today = new Date().toISOString().split('T')[0]

    // Get customer UUIDs for all selected pending customers
    const rows = await Promise.all(selectedPending.map(async (p) => {
      const weeklyEmi = Math.round(p.weeklyEmi)
      const count = p.count || 1
      const totalAmount = weeklyEmi * count

      // Get customer UUID
      let customerUUID = p.loan.customer?.id
      if (!customerUUID) {
        customerUUID = await getCustomerUUID(p.loan.customer_id)
      }

      if (!customerUUID) {
        throw new Error(`Could not find customer UUID for ${p.loan.customer?.name || p.loan.customer_id}`)
      }

      // compute remaining balance using consistent EMI calculation
      const loanTotalAmount = calculateTotalPayable(p.loan)
      const collectedSoFar = collections
        .filter(c => c.loan_id === p.loan.id)
        .reduce((s, c) => s + (Number(c.amount_collected) || 0), 0)
      const remainingBalance = Math.max(0, loanTotalAmount - collectedSoFar - totalAmount)

      return {
        loan_id: p.loan.id,
        customer_id: customerUUID,
        worker_id: p.loan.team_leader_id || null,
        amount_collected: totalAmount,
        remaining_balance: remainingBalance,
        status: 'completed',
        collection_date: today,
        notes: `Dashboard collection - ${p.loan.customer?.name || p.loan.customer_id}${count > 1 ? ` (COUNT = ${count})` : ''}`
      }
    }))

    setIsCollectingPending(true)
    try {
      const { data: insertedCollections, error } = await supabase
        .from('collections')
        .insert(rows)
        .select('id, loan_id, customer_id, amount_collected, collection_date, remaining_balance')

      if (error) {
        console.error('Error inserting collections:', error)
        alert(`Error collecting amounts: ${error.message}`)
        return
      }

      // Insert into collected_customers table
      if (insertedCollections && insertedCollections.length > 0) {
        try {
          const collectedCustomersData = insertedCollections.map(collection => ({
            loan_id: collection.loan_id,
            customer_id: collection.customer_id,
            collection_id: collection.id,
            collected_amount: collection.amount_collected,
            collection_date: collection.collection_date,
            collection_type: 'dashboard',
            status: 'collected',
            notes: `Dashboard collection - ${collection.loan_id}`
          }))

          const { error: collectedError } = await supabase
            .from('collected_customers')
            .insert(collectedCustomersData)

          if (collectedError) {
            console.error('Error inserting collected customers:', collectedError)
          } else {
            console.log('Successfully inserted collected customers:', collectedCustomersData)
          }
        } catch (collectedErr) {
          console.error('Unexpected error inserting collected customers:', collectedErr)
        }
      }

      // Mark pending customers as checked for collected loans
      const collectedLoanIds = rows.map(r => r.loan_id)
      console.log('Marking pending customers as checked for loan IDs:', collectedLoanIds)

      for (const loanId of collectedLoanIds) {
        try {
          const { error: updateError } = await supabase
            .from('pending_customers')
            .update({
              checked: true,
              checked_at: new Date().toISOString()
            })
            .eq('loan_id', loanId)

          if (updateError) {
            console.error(`Failed to mark pending customer as checked for loan ${loanId}:`, updateError)
          } else {
            console.log(`Successfully marked pending customer as checked for loan ${loanId}`)
          }
        } catch (updateErr) {
          console.warn('Failed to mark pending customer as checked:', updateErr)
        }
      }

      // Force refresh of all data to ensure consistency
      try {
        const [collectionsResult, pendingResult] = await Promise.all([
          supabase.from('collections').select(`*, customer:customers(*), loan:loans(*), worker:employees(*)`),
          supabase.from('pending_customers').select('loan_id, pending_count, emi_amount, checked').eq('checked', false)
        ])

        if (!collectionsResult.error) {
          setCollections(collectionsResult.data || [])
        }

        if (!pendingResult.error) {
          const map: Record<string, { count: number, emi: number }> = {}
            ; (pendingResult.data || []).forEach((r: any) => {
              if (!r.checked) { // Only add unchecked customers
                map[r.loan_id] = { count: Number(r.pending_count || 0), emi: Number(r.emi_amount || 0) }
              }
            })
          setPendingCustomersFromDB(map)
          console.log('Refreshed pending customers from database (unchecked only):', map)
        }
      } catch (refreshErr) {
        console.warn('Failed to refresh data:', refreshErr)
      }

      try {
        const bc = new BroadcastChannel('collections')
        bc.postMessage({ type: 'collections-updated', at: Date.now(), pending: [] })
        bc.close()
      } catch { }
      setSelectedPendingIds({})
      setShowPendingModal(false)
      try { alert('Collections updated successfully') } catch { }
    } catch (e) {
      try { alert('Error collecting amounts. Please try again.') } catch { }
    } finally {
      setIsCollectingPending(false)
    }
  }

  const handleViewBatchDetails = (batch: WeeklyBatch) => {
    setSelectedBatch(batch)
    setShowBatchModal(true)
    setSelectedWorkerId(null)
    setExpandedCustomerId(null)
    setCustomerSearchTerm('')
    setCurrentPage(1)
  }

  const handleViewCustomer = (loan: Loan) => {
    setSelectedCustomer(loan)
    setShowCustomerModal(true)
  }

  const handleEditCustomer = (loan: Loan) => {
    setCustomerToEdit(loan)
    setShowEditModal(true)
  }

  const handleDeleteCustomer = (loan: Loan) => {
    setCustomerToDelete(loan)
    // In a real app, this would show a confirmation modal
    if (confirm(`Are you sure you want to delete customer: ${loan.customer?.name}?`)) {
      const updatedLoans = loans.filter(l => l.id !== loan.id)
      setLoans(updatedLoans)
      localStorage.setItem('loans', JSON.stringify(updatedLoans))
      alert('Customer deleted successfully!')
    }
    setCustomerToDelete(null)
  }

  const handleUpdateLoan = async (updatedLoan: Loan) => {
    try {
      // Update loan in Supabase
      const { data, error } = await supabase
        .from('loans')
        .update({
          customer_id: updatedLoan.customer_id,
          amount: updatedLoan.amount,
          status: updatedLoan.status,
          start_date: updatedLoan.start_date,
          end_date: updatedLoan.end_date,
          interest_rate: updatedLoan.interest_rate,
          number_of_weeks: updatedLoan.number_of_weeks,
          team_leader_id: updatedLoan.team_leader_id,
          weekly_batch: updatedLoan.weekly_batch,
          loan_purpose: updatedLoan.loan_purpose,
          customer_bank_name: updatedLoan.customer_bank_name,
          account_number: updatedLoan.account_number,
          ifsc_code: updatedLoan.ifsc_code
        })
        .eq('id', updatedLoan.id)
        .select(`
          *,
          customer:customers(*),
          team_leader:employees(*)
        `)

      if (error) {
        console.error('Error updating loan:', error)
        alert('Error updating loan. Please try again.')
        return
      }

      // Update local state
      const updatedLoans = loans.map(l =>
        l.id === updatedLoan.id ? data[0] : l
      )
      setLoans(updatedLoans)

      setShowEditModal(false)
      setCustomerToEdit(null)
      alert('Loan updated successfully!')
    } catch (error) {
      console.error('Error updating loan:', error)
      alert('Error updating loan. Please try again.')
    }
  }

  const handleExportDashboardStats = () => {
    exportDashboardStats(stats, loans, employees, [])
  }

  const handleSearchClick = () => {
    setShowSearchModal(true)
  }

  const handleNotificationClick = () => {
    setShowNotificationModal(true)
  }

  const handleGlobalSearch = (term: string) => {
    setGlobalSearchTerm(term)
    // You can add more search logic here if needed
  }

  const handleChartTimeRangeChange = (range: string) => {
    setChartTimeRange(range)
    // You can add logic to filter data based on time range
  }

  const handleChartTypeToggle = () => {
    setSelectedChartType(prev => prev === 'bar' ? 'line' : 'bar')
  }

  const toggleChartAnimation = () => {
    setChartAnimation(prev => !prev)
  }

  const getChartGradient = (color: string) => {
    return `url(#gradient-${color})`
  }

  const handleExportWeeklyBatches = () => {
    exportWeeklyBatches(weeklyBatches, loans)
  }

  const handleExportBatchDetails = (batch: WeeklyBatch) => {
    exportBatchDetails(batch, loans)
  }

  const getBatchLoans = (batchDay: string) => {
    return loans.filter(loan => loan.weekly_batch === batchDay)
  }

  const getFilteredBatchLoans = (batchDay: string) => {
    let filteredLoans = getBatchLoans(batchDay)

    // Apply search filter - enhanced search functionality
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase().trim()
      filteredLoans = filteredLoans.filter(loan =>
        (loan.customer?.name && loan.customer.name.toLowerCase().includes(searchLower)) ||
        (loan.customer?.phone && loan.customer.phone.includes(searchTerm)) ||
        (loan.customer_id && loan.customer_id.toLowerCase().includes(searchLower)) ||
        (loan.loan_purpose && loan.loan_purpose.toLowerCase().includes(searchLower))
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filteredLoans = filteredLoans.filter(loan => loan.status === statusFilter)
    }

    // Apply worker filter
    if (workerFilter !== 'all') {
      filteredLoans = filteredLoans.filter(loan => loan.team_leader_id === workerFilter)
    }

    return filteredLoans
  }

  // Group loans by worker for a given batch
  const getBatchWorkersSummary = (batchDay: string) => {
    const loansInBatch = getFilteredBatchLoans(batchDay)
    const map: Record<string, { workerId: string, workerName: string, customerCount: number, totalWeeklyEmi: number }> = {}
    loansInBatch.forEach(loan => {
      const workerId = loan.team_leader_id || 'unassigned'
      const workerName = getWorkerName(loan.team_leader_id)
      // Calculate weekly EMI dynamically
      const weeklyEmi = computeWeeklyEmi(loan)
      if (!map[workerId]) {
        map[workerId] = { workerId, workerName, customerCount: 0, totalWeeklyEmi: 0 }
      }
      map[workerId].customerCount += 1
      map[workerId].totalWeeklyEmi += weeklyEmi
    })
    return Object.values(map)
  }

  const getWorkerLoansInBatch = (batchDay: string, workerId: string | null) => {
    const base = getFilteredBatchLoans(batchDay)
    let result = workerId ? base.filter(l => (l.team_leader_id || 'unassigned') === workerId) : base
    // customer-level search
    if (customerSearchTerm) {
      result = result.filter(l => (l.customer?.name || '').toLowerCase().includes(customerSearchTerm.toLowerCase()))
    }
    return result
  }

  const exportWorkersCsv = (batch: WeeklyBatch) => {
    const rows = [['Worker Name', 'Customer Count', 'Total Weekly EMI']]
    getBatchWorkersSummary(batch.day).forEach(w => {
      rows.push([w.workerName, String(w.customerCount), String(Math.round(w.totalWeeklyEmi))])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${batch.day}-workers.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCustomersCsv = (batch: WeeklyBatch, workerId: string) => {
    const rows = [['Customer Name', 'Loan Amount', 'Weekly EMI', 'Status']]
    getWorkerLoansInBatch(batch.day, workerId).forEach(loan => {
      const weeklyEmi = computeWeeklyEmi(loan)
      rows.push([loan.customer?.name || '', String(loan.amount), String(Math.round(weeklyEmi)), loan.status])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${batch.day}-customers-${selectedWorkerId || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Helper function to get worker name by ID
  const getWorkerName = (teamLeaderId?: string): string => {
    if (!teamLeaderId) return 'N/A'
    const worker = employees.find(emp => emp.id === teamLeaderId)
    return worker?.name || 'N/A'
  }

  // Helper function to calculate total weekly EMI for a batch
  const calculateWeeklyEMI = (batchDay: string): number => {
    const batchLoans = getBatchLoans(batchDay)
    let totalWeeklyEMI = 0

    batchLoans.forEach(loan => {
      // Calculate EMI using new formula: EMI = (Interest Rate × Loan Amount) / 100
      const weeklyEMI = computeWeeklyEmi(loan)
      totalWeeklyEMI += weeklyEMI
    })

    return totalWeeklyEMI
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-[100vw] overflow-x-hidden">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/20 p-5 md:p-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold gradient-text">Dashboard</h1>
            <p className="text-slate-600 mt-2 text-base md:text-lg">Welcome to your loan management system</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            {/* New Loan Application button removed per request */}
            <button
              onClick={handleExportDashboardStats}
              className="btn-success flex items-center space-x-2 hover-lift text-sm md:text-base px-3 py-2 md:px-4 md:py-2"
            >
              <Download className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
            <button
              onClick={handleSearchClick}
              className="p-2 md:p-3 text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100/80 transition-colors duration-300"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={handleNotificationClick}
              className="p-2 md:p-3 text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100/80 transition-colors duration-300 relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {(batchCollectionNotifications.length > 0 || effectivePendingCount > 0) && (
                <span className="absolute top-0 right-0 md:-top-1 md:-right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
            <button className="p-2 md:p-3 text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100/80 transition-colors duration-300">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-wrap lg:flex-nowrap gap-4 md:gap-6 w-full items-stretch">
        {/* Card 1: New Loans */}
        <div className="w-full sm:w-[calc(50%-12px)] lg:w-[250px] lg:flex-1 hover-lift animate-slide-up flex flex-col min-h-[200px] rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl relative overflow-hidden group cursor-pointer transition-all duration-500">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
          <div className="flex items-center justify-between relative z-10 mb-4">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">New Loans</p>
              <p className="text-sm text-slate-500 font-medium">This month</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-blue-500/30 shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <p className={`font-extrabold text-slate-800 tracking-tight leading-none mb-4 ${stats.newLoans >= 1000 ? 'text-4xl' : 'text-5xl'
              }`}>{stats.newLoans}</p>
            <div className="w-full flex items-center gap-2 mb-1">
              <div className="w-full bg-blue-100/50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${Math.min(stats.newLoans, 100)}%` }}>
                  {stats.newLoans > 0 && <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 blur-[1px]"></div>}
                </div>
              </div>
              <span className="text-[10px] font-bold text-blue-600/70 whitespace-nowrap">{Math.min(stats.newLoans, 100)}%</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Loans */}
        <div className="w-full sm:w-[calc(50%-12px)] lg:w-[250px] lg:flex-1 hover-lift animate-slide-up flex flex-col min-h-[200px] rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl relative overflow-hidden group cursor-pointer transition-all duration-500" style={{ animationDelay: '0.1s' }}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
          <div className="flex items-center justify-between relative z-10 mb-4">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active Loans</p>
              <p className="text-sm text-slate-500 font-medium">Currently active</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-emerald-500/30 shadow-lg transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <p className={`font-extrabold text-slate-800 tracking-tight leading-none mb-4 ${stats.activeLoans >= 1000 ? 'text-4xl' : 'text-5xl'
              }`}>{formatNumber(stats.activeLoans)}</p>
            <div className="flex items-center space-x-2 w-full">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">System Live</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Disbursed */}
        <div className="w-full sm:w-[calc(50%-12px)] lg:w-[250px] lg:flex-1 hover-lift animate-slide-up flex flex-col min-h-[200px] rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl relative overflow-hidden group cursor-pointer transition-all duration-500" style={{ animationDelay: '0.2s' }}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
          <div className="flex items-start justify-between relative z-10 mb-4 w-full">
            <div>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Total Disbursed</p>
              <p className="text-sm text-slate-500 font-medium">Lifetime value</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-purple-500/30 shadow-md transform group-hover:scale-110 transition-transform duration-500">
              <span className="text-lg font-bold text-white leading-none block">₹</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <p className={`font-extrabold text-slate-800 tracking-tight leading-none mb-4 break-words ${stats.totalDisbursed >= 1000000 ? 'text-3xl lg:text-3xl' : 'text-4xl'
              }`}>{formatNumber(stats.totalDisbursed)}</p>
            <svg className="w-full h-8 text-purple-500/20 group-hover:text-purple-500/40 transition-colors" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path d="M0 20 Q10 5, 20 15 T40 10 T60 15 T80 5 T100 20 Z" fill="currentColor" opacity="0.5" />
              <path d="M0 20 Q15 10, 25 15 T50 5 T75 15 T100 20 Z" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Card 4: Today's Collection */}
        <div className="w-full sm:w-[calc(50%-12px)] lg:w-[250px] lg:flex-1 hover-lift animate-slide-up flex flex-col min-h-[200px] rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl relative overflow-hidden group cursor-pointer transition-all duration-500" style={{ animationDelay: '0.3s' }}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-500"></div>
          <div className="flex items-start justify-between relative z-10 mb-4 w-full">
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Today's Target</p>
              <p className="text-sm text-slate-500 font-medium">Expected collection</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-amber-500/30 shadow-md transform group-hover:scale-110 transition-transform duration-500">
              <span className="text-lg font-bold text-white leading-none block">₹</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <p className={`font-extrabold text-slate-800 tracking-tight leading-none mb-4 break-words ${stats.todayCollection >= 1000000 ? 'text-3xl lg:text-3xl' : 'text-4xl'
              }`}>{formatNumber(stats.todayCollection)}</p>
            <div className="w-full flex items-center gap-2 mb-1" title={`Collected: ₹${collections.filter(c => c.collection_date === new Date().toISOString().split('T')[0]).reduce((sum, c) => sum + (Number(c.amount_collected) || 0), 0)} / Target: ₹${stats.todayCollection}`}>
              <div className="w-full bg-amber-100/50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-amber-400 h-1.5 rounded-full transition-all duration-1000 ease-out relative" style={{
                  width: `${stats.todayCollection > 0
                    ? Math.min(100, Math.round((collections.filter(c => c.collection_date === new Date().toISOString().split('T')[0]).reduce((sum, c) => sum + (Number(c.amount_collected) || 0), 0) / stats.todayCollection) * 100))
                    : 0}%`
                }}>
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 blur-[1px]"></div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-600/70 whitespace-nowrap">
                {stats.todayCollection > 0 ? Math.min(100, Math.round((collections.filter(c => c.collection_date === new Date().toISOString().split('T')[0]).reduce((sum, c) => sum + (Number(c.amount_collected) || 0), 0) / stats.todayCollection) * 100)) : 0}%
              </span>
            </div>
          </div>
        </div>

      </div> {/* End of Stats Cards flex container */}

      {/* Second Row of Stats Cards */}
      <div className="flex flex-wrap lg:flex-nowrap gap-4 md:gap-6 w-full items-stretch mt-4 md:mt-6">
        {/* Card 5: Today Profit */}
        <div className="w-full sm:w-[calc(50%-12px)] lg:w-[250px] lg:flex-1 hover-lift animate-slide-up flex flex-col min-h-[200px] rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl relative overflow-hidden group cursor-pointer transition-all duration-500" style={{ animationDelay: '0.4s' }}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl group-hover:bg-pink-500/20 transition-all duration-500"></div>
          <div className="flex items-start justify-between relative z-10 mb-4 w-full">
            <div>
              <p className="text-xs font-bold text-pink-600 uppercase tracking-wider">
                {(() => {
                  const day = new Date().getDay();
                  if (day === 2) return 'Tuesday Profit';
                  if (day === 4) return 'Thursday Profit';
                  if (day === 5) return 'Friday Profit';
                  return "Today's Profit";
                })()}
              </p>
              <p className="text-sm text-slate-500 font-medium">Expected target profit</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl shadow-pink-500/30 shadow-md transform group-hover:scale-110 transition-transform duration-500">
              <span className="text-lg font-bold text-white leading-none block">₹</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <p className={`font-extrabold text-slate-800 tracking-tight leading-none mb-4 break-words ${stats.todayProfit! >= 1000000 ? 'text-3xl lg:text-3xl' : 'text-4xl'}`}>
              {formatNumber(stats.todayProfit || 0)}
            </p>
            <div className="flex items-center space-x-2 w-full">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500"></span>
              </span>
              <span className="text-xs font-semibold text-pink-600 uppercase tracking-wider">Daily Target</span>
            </div>
          </div>
        </div>

        {/* Card 6: Total Profit */}
        <div className="w-full sm:w-[calc(50%-12px)] lg:w-[250px] lg:flex-1 hover-lift animate-slide-up flex flex-col min-h-[200px] rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl relative overflow-hidden group cursor-pointer transition-all duration-500" style={{ animationDelay: '0.5s' }}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-all duration-500"></div>
          <div className="flex items-start justify-between relative z-10 mb-4 w-full">
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Total Profit</p>
              <p className="text-sm text-slate-500 font-medium">Realized to date</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl shadow-green-500/30 shadow-md transform group-hover:scale-110 transition-transform duration-500">
              <span className="text-lg font-bold text-white leading-none block">₹</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <p className={`font-extrabold text-slate-800 tracking-tight leading-none mb-4 break-words ${stats.totalProfit! >= 1000000 ? 'text-3xl lg:text-3xl' : 'text-4xl'}`}>
              {formatNumber(stats.totalProfit || 0)}
            </p>
            <div className="w-full flex items-center gap-2 mb-1">
              <div className="w-full bg-green-100/50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-green-500 h-1.5 rounded-full transition-all duration-1000 ease-out relative" style={{ width: `100%` }}>
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 blur-[1px]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 7: Total Expected Balance */}
        <div className="w-full sm:w-[calc(50%-12px)] lg:w-[250px] lg:flex-1 hover-lift animate-slide-up flex flex-col min-h-[200px] rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl relative overflow-hidden group cursor-pointer transition-all duration-500" style={{ animationDelay: '0.6s' }}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all duration-500"></div>
          <div className="flex items-start justify-between relative z-10 mb-4 w-full">
            <div>
              <p className="text-xs font-bold text-sky-600 uppercase tracking-wider">Total Balance</p>
              <p className="text-sm text-slate-500 font-medium">Expected receivable</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl shadow-sky-500/30 shadow-md transform group-hover:scale-110 transition-transform duration-500">
              <span className="text-lg font-bold text-white leading-none block">₹</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <p className={`font-extrabold text-slate-800 tracking-tight leading-none mb-4 break-words ${stats.totalOutstandingBalance! >= 1000000 ? 'text-3xl lg:text-3xl' : 'text-4xl'}`}>
              {formatNumber(stats.totalOutstandingBalance || 0)}
            </p>
            <div className="flex items-center space-x-2 w-full">
              <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Outstanding</span>
            </div>
          </div>
        </div>

        {/* Card 8: Active Borrowers */}
        <div className="w-full sm:w-[calc(50%-12px)] lg:w-[250px] lg:flex-1 hover-lift animate-slide-up flex flex-col min-h-[200px] rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl relative overflow-hidden group cursor-pointer transition-all duration-500" style={{ animationDelay: '0.7s' }}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
          <div className="flex items-start justify-between relative z-10 mb-4 w-full">
            <div>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Active Customers</p>
              <p className="text-sm text-slate-500 font-medium">Unique borrowers</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-indigo-400 to-violet-600 rounded-xl shadow-indigo-500/30 shadow-md transform group-hover:scale-110 transition-transform duration-500">
              <span className="text-lg font-bold text-white leading-none block">#</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <p className={`font-extrabold text-slate-800 tracking-tight leading-none mb-4 break-words ${stats.activeCustomers! >= 1000 ? 'text-4xl' : 'text-5xl'}`}>
              {formatNumber(stats.activeCustomers || 0)}
            </p>
            <div className="flex items-center space-x-2 w-full">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Live Accounts</span>
            </div>
          </div>
        </div>

      </div> {/* End of Second Stats Cards flex container */}

      {/* Pending Customers Card (adaptive color by pending count) - Full Width */}
      {(() => {
        const count = effectivePendingCount
        const containerTone = count >= 10 ? 'bg-red-50/90 border-red-200' : count >= 5 ? 'bg-amber-50/90 border-amber-200' : 'bg-blue-50/90 border-blue-200'
        const titleTone = count >= 10 ? 'text-red-900' : count >= 5 ? 'text-amber-900' : 'text-blue-900'
        const labelTone = count >= 10 ? 'text-red-700' : count >= 5 ? 'text-amber-700' : 'text-blue-700'
        return (
          <div className={`w-full mt-2 p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border backdrop-blur-xl ${containerTone} transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group`}>
            <div className={`absolute -right-20 -bottom-20 w-64 h-64 rounded-full blur-3xl opacity-20 ${count >= 10 ? 'bg-red-500' : count >= 5 ? 'bg-amber-500' : 'bg-blue-500'} group-hover:opacity-30 transition-opacity duration-500`}></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between relative z-10 gap-4">
              <div>
                <p className={`text-sm font-bold uppercase tracking-wider ${titleTone}`}>
                  Pending Customers
                  {isSyncing && (
                    <span className="ml-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/60 text-blue-800 shadow-sm border border-blue-100">
                      <span className="flex h-2 w-2 relative mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                      Syncing
                    </span>
                  )}
                </p>
                <p className="text-4xl lg:text-4xl font-extrabold text-slate-800 tracking-tight mt-2">{count}</p>
              </div>
              <div className="sm:text-right">
                <p className={`text-sm font-semibold uppercase tracking-wider ${labelTone}`}>Amount Due</p>
                <p className="text-2xl lg:text-2xl font-extrabold text-slate-800 mt-1">{formatCurrency(effectivePendingTotal)}</p>
              </div>
            </div>
            {/* Inline preview of pending names and EMI (top 5) for immediate feedback */}
            <div className="mt-8 space-y-2 relative z-10">
              {mergedPendingList.slice(0, 5).map(p => ({
                name: p.loan.customer?.name || getCustomerNameByLoanId(p.loan.id),
                emi: p.weeklyEmi,
                count: p.count || 1,
                fromDB: p.fromDB,
                fromEvent: p.fromEvent
              })).map((row, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm p-4 bg-white/40 rounded-xl hover:bg-white/60 transition-colors border border-white/20 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-slate-800 truncate max-w-[60%] md:text-base">{row.name}</span>
                    {row.count > 1 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                        COUNT = {row.count}
                      </span>
                    )}
                    {row.fromDB && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                        Unchecked
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-slate-700 bg-white/50 px-3 py-1 rounded-lg border border-white/40">{formatCurrency(row.emi * row.count)}</span>
                </div>
              ))}
              {count > 5 && (
                <div className="relative pt-2">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-transparent px-2 text-xs font-semibold text-slate-500">+{count - 5} more</span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between text-sm relative z-10 gap-4">
              <span className={`font-medium ${count > 0 ? labelTone : 'text-slate-500'}`}>{count > 0 ? 'There are unchecked customers from Collections' : 'No pending customers from Collections page'}</span>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  onClick={refreshPendingCustomers}
                  className="px-4 py-2.5 text-sm font-semibold bg-white/50 hover:bg-white/80 text-slate-700 rounded-xl transition-colors border border-white/50 shadow-sm flex-1 sm:flex-none text-center hover:shadow-md"
                  title="Refresh pending customers"
                >
                  Refresh
                </button>
                <button
                  onClick={() => {
                    const map: Record<string, boolean> = {}
                    mergedPendingList.forEach(p => { map[p.loan.id] = true })
                    setSelectedPendingIds(map)
                    setShowPendingModal(true)
                  }}
                  className={`px-5 py-2.5 rounded-xl text-white font-semibold shadow-md flex-1 sm:flex-none text-center transition-all hover:-translate-y-0.5 ${count >= 10 ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:shadow-red-500/30 w-full sm:w-auto' : count >= 5 ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-amber-500/30' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-blue-500/30'}`}
                >
                  View & Collect
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Weekly Batch Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl text-gray-900">Weekly Collection Batches</h2>
            {isSyncing && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-1"></div>
                Syncing with Collections...
              </span>
            )}
          </div>
          <button
            onClick={handleExportWeeklyBatches}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {weeklyBatches.map((batch, index) => (
            <div key={batch.id} className="card-gradient hover-lift animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-xl shadow-lg ${batch.day === 'tuesday' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                    batch.day === 'thursday' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
                      'bg-gradient-to-br from-purple-500 to-pink-600'
                    }`}>
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{batch.name}</h3>
                    <p className="text-sm text-slate-600">Next Collection: {batch.next_collection_date}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-600">Weekly EMI</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(calculateWeeklyEMI(batch.day))}</p>
                </div>

                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-600">Customers</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{batch.customer_count}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-600">Status</span>
                </div>
                <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full text-sm font-medium">
                  Active Collection
                </span>
              </div>

              <button
                onClick={() => handleViewBatchDetails(batch)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-300 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/50"
              >
                View Collection Details
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* New Loans Trend Chart */}
        <div className="card-gradient hover-lift animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">New Loans Trend</h3>
                <p className="text-sm text-slate-600">Monthly loan applications</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={chartTimeRange}
                onChange={(e) => handleChartTimeRangeChange(e.target.value)}
                className="px-3 py-2 bg-white/80 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="3M">3 Months</option>
                <option value="6M">6 Months</option>
                <option value="1Y">1 Year</option>
              </select>
              <button
                onClick={handleChartTypeToggle}
                className="p-2 bg-white/80 hover:bg-white border border-slate-200 rounded-lg transition-colors duration-300"
                title="Toggle Chart Type"
              >
                {selectedChartType === 'bar' ? <TrendingUp className="w-4 h-4 text-slate-600" /> : <BarChart className="w-4 h-4 text-slate-600" />}
              </button>
              <button
                onClick={toggleChartAnimation}
                className={`p-2 rounded-lg transition-colors duration-300 ${chartAnimation ? 'bg-blue-100 text-blue-600' : 'bg-white/80 text-slate-600 border border-slate-200'}`}
                title="Toggle Animation"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="h-80 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={newLoanTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradient-blue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(10px)'
                  }}
                  formatter={(value) => [value, 'New Loans']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Bar
                  dataKey="value"
                  fill="url(#gradient-blue)"
                  radius={[8, 8, 0, 0]}
                  animationDuration={chartAnimation ? 1000 : 0}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disbursement Trend Chart */}
        <div className="card-gradient hover-lift animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                <span className="text-xl font-bold text-white">₹</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Disbursement Trend</h3>
                <p className="text-sm text-slate-600">Monthly disbursed amounts</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={chartTimeRange}
                onChange={(e) => handleChartTimeRangeChange(e.target.value)}
                className="px-3 py-2 bg-white/80 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="3M">3 Months</option>
                <option value="6M">6 Months</option>
                <option value="1Y">1 Year</option>
              </select>
              <button
                onClick={handleChartTypeToggle}
                className="p-2 bg-white/80 hover:bg-white border border-slate-200 rounded-lg transition-colors duration-300"
                title="Toggle Chart Type"
              >
                {selectedChartType === 'line' ? <TrendingUp className="w-4 h-4 text-slate-600" /> : <BarChart className="w-4 h-4 text-slate-600" />}
              </button>
              <button
                onClick={toggleChartAnimation}
                className={`p-2 rounded-lg transition-colors duration-300 ${chartAnimation ? 'bg-emerald-100 text-emerald-600' : 'bg-white/80 text-slate-600 border border-slate-200'}`}
                title="Toggle Animation"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="h-80 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={disbursementTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradient-emerald" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(10px)'
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: '#10B981', strokeWidth: 2, fill: '#fff' }}
                  animationDuration={chartAnimation ? 1000 : 0}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Batch Details Modal */}
      {showBatchModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-xl md:text-2xl text-gray-900 font-bold">{selectedBatch.name} Details</h2>
              <div className="flex flex-wrap items-center gap-2 md:space-x-3">
                <button
                  onClick={() => handleExportBatchDetails(selectedBatch)}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setShowBatchCollectModal(true)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  Collect Amount
                </button>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Breadcrumbs */}
            <div className="text-sm text-gray-600 mb-4">
              <nav className="flex items-center space-x-2">
                <button className="hover:underline" onClick={() => { setSelectedWorkerId(null); setExpandedCustomerId(null) }}>Weekly Summary</button>
                {selectedWorkerId && <>
                  <span>/</span>
                  <button className="hover:underline" onClick={() => { setExpandedCustomerId(null) }}>{getWorkerName(selectedWorkerId === 'unassigned' ? undefined : selectedWorkerId)}</button>
                  {expandedCustomerId && <>
                    <span>/</span>
                    <span>Customers</span>
                    <span>/</span>
                    <span>Loan Details</span>
                  </>}
                </>}
              </nav>
            </div>

            {/* Summary cards removed as requested */}

            <div className="mb-6">
              {!selectedWorkerId && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg text-gray-900">Workers in this Batch</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getBatchWorkersSummary(selectedBatch.day).map(w => (
                      <div key={w.workerId} className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-md text-gray-900">{w.workerName}</h4>
                          <span className="text-sm text-gray-600">{w.customerCount} customers</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">Total Weekly EMI: <span className="text-gray-900">{formatCurrency(w.totalWeeklyEmi)}</span></p>
                        <button onClick={() => { setSelectedWorkerId(w.workerId); setExpandedCustomerId(null); setCustomerSearchTerm(''); setCurrentPage(1) }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">View Customers</button>
                      </div>
                    ))}
                  </div>
                  {/* Summary Row */}
                  <div className="mt-4 bg-gray-50 border rounded-lg p-3 text-sm text-gray-800 flex items-center justify-between">
                    <span>Total Workers: {getBatchWorkersSummary(selectedBatch.day).length}</span>
                    <span>Total Customers: {getFilteredBatchLoans(selectedBatch.day).length}</span>
                    <span>Total Weekly EMI: {formatCurrency(getBatchWorkersSummary(selectedBatch.day).reduce((s, w) => s + w.totalWeeklyEmi, 0))}</span>
                  </div>
                </div>
              )}

              {selectedWorkerId && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg text-gray-900">Loans in this batch - {getWorkerName(selectedWorkerId === 'unassigned' ? undefined : selectedWorkerId)}</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => { setSelectedWorkerId(null); setExpandedCustomerId(null) }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <div className="relative">
                        <input type="text" placeholder="Search customers..." value={customerSearchTerm} onChange={(e) => { setCustomerSearchTerm(e.target.value); setCurrentPage(1) }} className="pl-8 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      </div>

                    </div>
                  </div>

                  {(() => {
                    const all = getWorkerLoansInBatch(selectedBatch.day, selectedWorkerId)
                    const total = all.length
                    const start = (currentPage - 1) * pageSize
                    const pageItems = all.slice(start, start + pageSize)
                    return (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer ID</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Amount</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenure</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">R%</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMI</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TOTAL</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">START</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CLOSING</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COUNT</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PAID</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BALANCE</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PROFIT</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {pageItems.map(loan => {
                                const rate = loan.interest_rate || '8.33'
                                const weeklyEmi = computeWeeklyEmi(loan)
                                const totalInterest = calculateTotalPayable(loan)
                                const loanCollections = collections.filter(c => c.loan_id === loan.id)
                                const actualPaidAmount = loanCollections.reduce((sum, c) => sum + c.amount_collected, 0)
                                const weeksPaid = Math.floor(actualPaidAmount / weeklyEmi)
                                const paidAmount = weeksPaid * weeklyEmi
                                const balanceAmount = Math.max(0, totalInterest - actualPaidAmount)
                                const profitPerWeek = Math.round((totalInterest - loan.amount) / (loan.number_of_weeks || 15))
                                const profitAmount = profitPerWeek * weeksPaid
                                return (
                                  <tr key={loan.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{loan.customer?.customer_id_display || 'N/A'}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{loan.customer?.name || 'N/A'}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(loan.amount)}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{loan.number_of_weeks || 15} weeks</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{rate}%</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(weeklyEmi)}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(totalInterest)}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(loan.start_date).toLocaleDateString('en-GB')}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(loan.end_date).toLocaleDateString('en-GB')}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{weeksPaid}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(paidAmount)}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(balanceAmount)}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(profitAmount)}</td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${loan.status === 'active' ? 'bg-green-100 text-green-800' : loan.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{loan.status}</span>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                                      <div className="flex items-center space-x-2">
                                        <button onClick={() => handleViewCustomer(loan)} className="text-blue-600 hover:text-blue-900" title="View Details"><Eye className="w-4 h-4" /></button>
                                        <button onClick={() => handleEditCustomer(loan)} className="text-gray-600 hover:text-gray-900" title="Edit"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteCustomer(loan)} className="text-red-600 hover:text-red-900" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-4 text-sm text-gray-700">
                          <div>Showing {Math.min(start + 1, total)}–{Math.min(start + pageSize, total)} of {total}</div>
                          <div className="flex items-center space-x-2">
                            <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Prev</button>
                            <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={start + pageSize >= total} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-gray-900">Loans in this Batch</h3>
                <div className="flex items-center space-x-4">
                  {/* Search Box */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search customers, loans, or workers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-3 w-80 bg-white/80 backdrop-blur-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 placeholder:text-slate-400"
                    />
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>

                  {/* Worker Filter */}
                  <select
                    value={workerFilter}
                    onChange={(e) => setWorkerFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Workers</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Back
                </button>
              </div>

              {getFilteredBatchLoans(selectedBatch.day).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer ID</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Amount</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenure</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">R%</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMI</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TOTAL</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">START</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CLOSING</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COUNT</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PAID</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BALANCE</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PROFIT</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredBatchLoans(selectedBatch.day).map((loan) => {
                        // Calculate EMI using new formula: EMI = (Interest Rate × Loan Amount) / 100
                        const emi = calculateEMI(loan)
                        const totalAmount = calculateTotalPayable(loan)
                        const weeklyEMI = computeWeeklyEmi(loan)
                        const interestRate = loan.interest_rate || '8.33'

                        // Get actual collections for this loan
                        const loanCollections = collections.filter(c => c.loan_id === loan.id)
                        const actualPaidAmount = loanCollections.reduce((sum, c) => sum + c.amount_collected, 0)

                        // Calculate weeks paid based on actual collections (COUNT)
                        const weeksPaid = Math.floor(actualPaidAmount / weeklyEMI)

                        // Calculate paid amount (COUNT × EMI)
                        const paidAmount = weeksPaid * weeklyEMI

                        // Calculate remaining balance
                        const balanceAmount = Math.max(0, totalAmount - actualPaidAmount)

                        // Calculate profit collected so far
                        const profitPerWeek = Math.round((totalAmount - loan.amount) / (loan.number_of_weeks || 15))
                        const profitAmount = profitPerWeek * weeksPaid

                        return (
                          <tr key={loan.id} className="hover:bg-gray-50">
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {loan.customer?.customer_id_display || 'N/A'}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {getWorkerName(loan.team_leader_id)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {loan.customer?.name || 'N/A'}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(loan.amount)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {loan.number_of_weeks || 15} weeks
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {interestRate}%
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(weeklyEMI)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(totalAmount)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(loan.start_date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(loan.end_date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {weeksPaid}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(paidAmount)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(balanceAmount)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${loan.status === 'active' ? 'bg-green-100 text-green-800' :
                                loan.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(profitAmount)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleViewCustomer(loan)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEditCustomer(loan)}
                                  className="text-gray-600 hover:text-gray-900"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomer(loan)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}

                      {/* Summary Row */}
                      {getFilteredBatchLoans(selectedBatch.day).length > 0 && (
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={3} className="px-3 py-4 text-sm text-gray-900 text-right">
                            TOTALS:
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900">
                            {formatCurrency(
                              getFilteredBatchLoans(selectedBatch.day).reduce((sum, loan) => sum + loan.amount, 0)
                            )}
                          </td>
                          <td colSpan={2} className="px-3 py-4 text-sm text-gray-900"></td>
                          <td className="px-3 py-4 text-sm text-gray-900">
                            {formatCurrency(
                              getFilteredBatchLoans(selectedBatch.day).reduce((sum, loan) => sum + computeWeeklyEmi(loan), 0)
                            )}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900">
                            {formatCurrency(
                              getFilteredBatchLoans(selectedBatch.day).reduce((sum, loan) => sum + calculateTotalPayable(loan), 0)
                            )}
                          </td>
                          <td colSpan={3} className="px-3 py-4 text-sm text-gray-900"></td>
                          <td className="px-3 py-4 text-sm text-gray-900">
                            {formatCurrency(
                              getFilteredBatchLoans(selectedBatch.day).reduce((sum, loan) => {
                                const weeklyEMI = computeWeeklyEmi(loan)
                                const loanCollections = collections.filter(c => c.loan_id === loan.id)
                                const actualPaidAmount = loanCollections.reduce((s, c) => s + c.amount_collected, 0)
                                const weeksPaid = Math.floor(actualPaidAmount / weeklyEMI)
                                return sum + (weeksPaid * weeklyEMI)
                              }, 0)
                            )}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900">
                            {formatCurrency(
                              getFilteredBatchLoans(selectedBatch.day).reduce((sum, loan) => {
                                const totalAmount = calculateTotalPayable(loan)
                                const loanCollections = collections.filter(c => c.loan_id === loan.id)
                                const actualPaidAmount = loanCollections.reduce((s, c) => s + c.amount_collected, 0)
                                return sum + Math.max(0, totalAmount - actualPaidAmount)
                              }, 0)
                            )}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900"></td>
                          <td className="px-3 py-4 text-sm text-gray-900">
                            {formatCurrency(
                              getFilteredBatchLoans(selectedBatch.day).reduce((sum, loan) => {
                                const totalAmount = calculateTotalPayable(loan)
                                const weeklyEMI = computeWeeklyEmi(loan)
                                const loanCollections = collections.filter(c => c.loan_id === loan.id)
                                const actualPaidAmount = loanCollections.reduce((s, c) => s + c.amount_collected, 0)
                                const weeksPaid = Math.floor(actualPaidAmount / weeklyEMI)
                                const profitPerWeek = Math.round((totalAmount - loan.amount) / (loan.number_of_weeks || 15))
                                return sum + (profitPerWeek * weeksPaid)
                              }, 0)
                            )}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900"></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No loans in this batch yet</p>
                  <p className="text-sm">Loans will appear here when assigned to this weekly batch.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowBatchModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Customers Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h2 className="text-lg md:text-xl text-gray-900 font-bold">Pending Customers - This Week</h2>
              <button onClick={() => setShowPendingModal(false)} className="text-gray-400 hover:text-gray-600 self-end sm:self-auto"><X className="w-6 h-6" /></button>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-gray-600">Select pending customers to collect this week's EMI</p>
              <div className="flex items-center space-x-2">
                <button onClick={toggleSelectAllPending} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Select All</button>
                <button onClick={handleCollectForSelected} disabled={isCollectingPending || Object.keys(selectedPendingIds).length === 0} className={`px-3 py-2 rounded-lg text-sm text-white ${isCollectingPending || Object.keys(selectedPendingIds).length === 0 ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>{isCollectingPending ? 'Collecting...' : 'Collect Amount'}</button>
              </div>
            </div>

            {mergedPendingList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No pending customers for this week.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mergedPendingList.map(p => (
                  <div key={p.loan.id} className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-bold text-gray-900">
                            {p.loan.customer?.customer_id_display ? `[${p.loan.customer.customer_id_display}] ` : ''}
                            {p.loan.customer?.name || getCustomerNameByLoanId(p.loan.id)}
                          </p>
                          {p.count && p.count > 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              COUNT = {p.count}
                            </span>
                          )}
                          {p.fromDB && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Unchecked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">
                          Weekly EMI: {formatCurrency(p.weeklyEmi)}
                          {p.count && p.count > 1 && (
                            <span className="ml-2 text-red-600 font-medium">
                              Total: {formatCurrency(p.weeklyEmi * p.count)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={!!selectedPendingIds[p.loan.id]}
                          onChange={() => toggleSelectPending(p.loan.id)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleIndividualCollection(p.loan.id)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors duration-200"
                      >
                        Collect Now
                      </button>
                      <span className="text-xs text-gray-500">
                        {p.loan.team_leader?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button onClick={() => setShowPendingModal(false)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Collect Modal (for specific week) */}
      {showBatchModal && selectedBatch && showBatchCollectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl text-gray-900">Collect Amount - {selectedBatch.name}</h2>
              <button onClick={() => setShowBatchCollectModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-gray-600">Select customers to collect this week's EMI</p>
              <div className="flex items-center space-x-2">
                <button onClick={() => {
                  const base = getFilteredBatchLoans(selectedBatch.day)
                  if (Object.keys(selectedBatchCollectIds).length === base.length) {
                    setSelectedBatchCollectIds({})
                  } else {
                    const map: Record<string, boolean> = {}
                    base.forEach(l => { map[l.id] = true })
                    setSelectedBatchCollectIds(map)
                  }
                }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Select All</button>
                <button onClick={async () => {
                  try {
                    const today = new Date().toISOString().split('T')[0]
                    const selectedLoans = getFilteredBatchLoans(selectedBatch.day)
                      .filter(l => selectedBatchCollectIds[l.id])

                    if (selectedLoans.length === 0) {
                      alert('Please select at least one customer to collect from')
                      return
                    }

                    const toInsert = await Promise.all(selectedLoans.map(async (l) => {
                      const weeklyEmi = Math.round(computeWeeklyEmi(l))

                      // Get customer UUID
                      let customerUUID = l.customer?.id
                      if (!customerUUID) {
                        customerUUID = await getCustomerUUID(l.customer_id)
                      }

                      if (!customerUUID) {
                        throw new Error(`Could not find customer UUID for ${l.customer?.name || l.customer_id}`)
                      }

                      // Calculate remaining balance using consistent EMI calculation
                      const totalLoanAmount = calculateTotalPayable(l)
                      const collectedSoFar = collections
                        .filter(c => c.loan_id === l.id)
                        .reduce((s, c) => s + (Number(c.amount_collected) || 0), 0)
                      const remainingBalance = Math.max(0, totalLoanAmount - collectedSoFar - weeklyEmi)

                      return {
                        loan_id: l.id,
                        customer_id: customerUUID,
                        worker_id: l.team_leader_id || null,
                        amount_collected: weeklyEmi,
                        remaining_balance: remainingBalance,
                        status: 'completed',
                        collection_date: today,
                        notes: `Batch collection - ${selectedBatch.name}`
                      }
                    }))

                    const { data: insertedCollections, error } = await supabase
                      .from('collections')
                      .insert(toInsert)
                      .select('id, loan_id, customer_id, amount_collected, collection_date, remaining_balance')

                    if (error) {
                      console.error('Error inserting collections:', error)
                      alert(`Error collecting amounts: ${error.message}`)
                      return
                    }

                    // Check for loans that should be closed (remaining balance = 0)
                    for (const collection of insertedCollections || []) {
                      const remainingBalance = (collection as any).remaining_balance || 0
                      if (remainingBalance <= 0) {
                        // Close the loan
                        const { error: closeError } = await supabase
                          .from('loans')
                          .update({ status: 'closed' })
                          .eq('id', collection.loan_id)

                        if (closeError) {
                          console.error('Error closing loan:', closeError)
                        } else {
                          console.log(`Loan ${collection.loan_id} closed - customer has paid full amount`)
                        }
                      }
                    }

                    // Refresh data
                    const { data: collectionsData } = await supabase
                      .from('collections')
                      .select(`*, customer:customers(*), loan:loans(*), worker:employees(*)`)
                    setCollections(collectionsData || [])

                    // Refresh loans to get updated status
                    const { data: loansData } = await supabase
                      .from('loans')
                      .select(`*, customer:customers(*), team_leader:employees(*)`)
                    setLoans(loansData || [])

                    setSelectedBatchCollectIds({})
                    setShowBatchCollectModal(false)
                    alert(`Successfully collected amounts from ${selectedLoans.length} customer(s)`)

                  } catch (error) {
                    console.error('Unexpected error during batch collection:', error)
                    alert('An unexpected error occurred. Please try again.')
                  }
                }} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Collect Amount</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getFilteredBatchLoans(selectedBatch.day).map(loan => (
                <label key={loan.id} className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between cursor-pointer hover:shadow-md transition">
                  <div>
                    <p className="text-sm text-gray-900">{loan.customer?.name}</p>
                    <p className="text-xs text-gray-600">Weekly EMI: {formatCurrency(computeWeeklyEmi(loan))}</p>
                  </div>
                  <input type="checkbox" className="w-4 h-4" checked={!!selectedBatchCollectIds[loan.id]} onChange={() => setSelectedBatchCollectIds(prev => ({ ...prev, [loan.id]: !prev[loan.id] }))} />
                </label>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <button onClick={() => setShowBatchCollectModal(false)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Customer Details Modal */}
      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Customer Details</h2>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {selectedCustomer.customer?.customer_id_display && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer ID</label>
                  <p className="text-sm font-mono font-semibold text-primary-700">{selectedCustomer.customer.customer_id_display}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                <p className="text-sm text-gray-900">{splitCustomerNames(selectedCustomer.customer?.name).customerName || selectedCustomer.customer?.name}</p>
              </div>
              {splitCustomerNames(selectedCustomer.customer?.name).name ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">{splitCustomerNames(selectedCustomer.customer?.name).name}</p>
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="text-sm text-gray-900">{selectedCustomer.customer?.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Loan Amount</label>
                <p className="text-sm text-gray-900">{formatCurrency(selectedCustomer.amount)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className="text-sm text-gray-900 capitalize">{selectedCustomer.status}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <p className="text-sm text-gray-900">{selectedCustomer.start_date}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <p className="text-sm text-gray-900">{selectedCustomer.end_date}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned Worker</label>
                <p className="text-sm text-gray-900">{getWorkerName(selectedCustomer.team_leader_id)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Weekly Batch</label>
                <p className="text-sm text-gray-900 capitalize">{selectedCustomer.weekly_batch}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Loan Modal */}
      {showEditModal && customerToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Edit Loan Details</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const updatedLoan: Loan = {
                ...customerToEdit,
                customer_id: formData.get('customer_id') as string,
                amount: parseFloat(formData.get('amount') as string),
                status: formData.get('status') as 'active' | 'closed' | 'pending',
                start_date: formData.get('start_date') as string,
                end_date: formData.get('end_date') as string,
                team_leader_id: formData.get('team_leader_id') as string,
                interest_rate: formData.get('interest_rate') as string,
                number_of_weeks: parseInt(formData.get('number_of_weeks') as string)
              }
              handleUpdateLoan(updatedLoan)
            }}>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                  <input
                    type="text"
                    name="customer_id"
                    defaultValue={customerToEdit.customer_id}
                    className="input-field"
                    required
                    placeholder="e.g., CUST001, CUST002"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={splitCustomerNames(customerToEdit.customer?.name).customerName || customerToEdit.customer?.name || ''}
                    className="input-field bg-gray-100"
                    readOnly
                  />
                </div>
                {splitCustomerNames(customerToEdit.customer?.name).name ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={splitCustomerNames(customerToEdit.customer?.name).name}
                      className="input-field bg-gray-100"
                      readOnly
                    />
                  </div>
                ) : null}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label>
                  <input
                    type="number"
                    name="amount"
                    defaultValue={customerToEdit.amount}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={customerToEdit.status}
                    className="input-field"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Leader</label>
                  <select
                    name="team_leader_id"
                    defaultValue={customerToEdit.team_leader_id || ''}
                    className="input-field"
                    required
                  >
                    <option value="">Select team leader</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate</label>
                  <select
                    name="interest_rate"
                    defaultValue={customerToEdit.interest_rate || '8.33'}
                    className="input-field"
                    required
                  >
                    <option value="8.33">8.33%</option>
                    <option value="6.33">6.33%</option>
                    <option value="12">12%</option>
                    <option value="110">110%</option>
                    <option value="115">115%</option>
                    <option value="10">10%</option>
                    <option value="25">25%</option>
                    <option value="30">30%</option>
                    <option value="111.11">111.11%</option>
                    <option value="20">20%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Weeks</label>
                  <input
                    type="number"
                    name="number_of_weeks"
                    defaultValue={customerToEdit.number_of_weeks || 15}
                    className="input-field"
                    required
                    min="1"
                    max="52"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={customerToEdit.start_date}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    defaultValue={customerToEdit.end_date}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Update Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="modal-overlay" onClick={() => setShowSearchModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold gradient-text">Search</h2>
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customers, loans, or workers..."
                  value={globalSearchTerm}
                  onChange={(e) => handleGlobalSearch(e.target.value)}
                  className="input-field pl-10"
                />
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              </div>

              {globalSearchTerm && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600">
                    Search results for: <span className="font-semibold">"{globalSearchTerm}"</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Search functionality will be implemented based on your requirements.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="modal-overlay" onClick={() => setShowNotificationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold gradient-text">Notifications</h2>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Batch Collection Notifications */}
              {batchCollectionNotifications.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Batch Collections</h3>
                  {batchCollectionNotifications.map(notification => (
                    <div key={notification.id} className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-green-900">
                            {notification.batch.charAt(0).toUpperCase() + notification.batch.slice(1)} Batch Collection
                          </h4>
                          <p className="text-sm text-green-700 mt-1">
                            Collected: {notification.collectedCount} customers | Pending: {notification.pendingCount} customers
                          </p>
                          <p className="text-xs text-green-600 mt-2">
                            {new Date(notification.timestamp).toLocaleDateString()} at {new Date(notification.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900">Pending Collections</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      You have {effectivePendingCount} customers with pending payments totaling {formatCurrency(effectivePendingTotal)}.
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900">System Status</h3>
                    <p className="text-sm text-green-700 mt-1">
                      All systems are running normally. Database connection is active.
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

