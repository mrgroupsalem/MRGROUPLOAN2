'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { Loan, Customer, Employee } from '@/types'
import EmergencyLoanApplication from './EmergencyLoanApplication'
import { 
  ArrowLeft, 
  Flame, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Plus,
  Calendar,
  DollarSign,
  User,
  Users,
  TrendingDown,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'

interface EmergencyLoanProps {
  onBack: () => void
}

interface EmergencyLoanData extends Loan {
  remainingDays: number
  isExpired: boolean
  isExpiringSoon: boolean
  loanLimitDays: number
  collectionAmount: number
}

interface TeamLeaderGroup {
  teamLeader: Employee | null
  loans: EmergencyLoanData[]
  totalAmount: number
  activeCount: number
  closedCount: number
}

export default function EmergencyLoan({ onBack }: EmergencyLoanProps) {
  const [loans, setLoans] = useState<Loan[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [collections, setCollections] = useState<any[]>([])
  const [emergencyCollections, setEmergencyCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed'>('all')
  const [sortBy, setSortBy] = useState<'remainingDays' | 'amount' | 'customer' | 'teamLeader'>('remainingDays')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<EmergencyLoanData | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [loanToEdit, setLoanToEdit] = useState<EmergencyLoanData | null>(null)
  const [loanToDelete, setLoanToDelete] = useState<EmergencyLoanData | null>(null)
  const [collectingLoanId, setCollectingLoanId] = useState<string | null>(null)

  // Emergency Loan Conditions
  const getLoanLimitDays = (loanAmount: number, collectionAmount: number): number => {
    if (loanAmount === 10000) {
      if (collectionAmount === 100) return 10
      if (collectionAmount === 200) return 7
      if (collectionAmount === 300) return 5
    }
    // Default fallback
    return 10
  }

  // Calculate remaining days and check expiry
  const processEmergencyLoans = (loans: Loan[]): EmergencyLoanData[] => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return loans.map(loan => {
      const startDate = new Date(loan.start_date)
      startDate.setHours(0, 0, 0, 0)
      
      // Get collection amount (due_amount) from emergency_loans table
      // The loan object should have due_amount from the emergency_loans table
      let collectionAmount = (loan as any).due_amount || (loan as any).collection_amount
      
      // If not stored, try to infer from notes or use default
      if (!collectionAmount) {
        const notes = (loan as any).notes || ''
        const collectionMatch = notes.match(/collection[:\s]+₹?(\d+)/i)
        if (collectionMatch) {
          collectionAmount = Number(collectionMatch[1])
        } else {
          // Default: If loan is 10,000, use 100 (10 days)
          collectionAmount = Number(loan.amount) === 10000 ? 100 : 100
        }
      }
      
      // Get number_of_days from emergency loan data
      const numberOfDays = (loan as any).number_of_days || getLoanLimitDays(Number(loan.amount) || 10000, collectionAmount)
      
      const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const remainingDays = Math.max(0, numberOfDays - daysDiff)
      const isExpired = remainingDays === 0 && daysDiff >= numberOfDays
      const isExpiringSoon = remainingDays <= 1 && remainingDays > 0

      return {
        ...loan,
        remainingDays,
        isExpired,
        isExpiringSoon,
        loanLimitDays: numberOfDays,
        collectionAmount
      } as EmergencyLoanData
    })
  }

  // Check and move expired loans to closed_loans table
  const checkAndMoveExpiredLoans = async (processedLoans: EmergencyLoanData[]) => {
    const expiredLoans = processedLoans.filter(loan => loan.isExpired && loan.status === 'active')
    
    if (expiredLoans.length > 0) {
      for (const loan of expiredLoans) {
        try {
          // Get the emergency loan data
          const { data: emergencyLoan, error: fetchError } = await supabase
            .from('emergency_loans')
            .select('*')
            .eq('id', loan.id)
            .single()

          if (fetchError || !emergencyLoan) {
            console.error(`Error fetching emergency loan ${loan.id}:`, fetchError)
            continue
          }

          // Get customer and team leader data for denormalization
          const customer = loan.customer || (customers.find(c => c.id === emergencyLoan.customer_id))
          const teamLeader = loan.team_leader || (employees.find(e => e.id === emergencyLoan.team_leader_id))

          // Calculate total amount paid (you may need to calculate from collections)
          // For now, we'll set it to 0 - you can enhance this later
          const totalAmountPaid = 0
          const balanceAtClosure = emergencyLoan.loan_amount - totalAmountPaid

          // Insert into closed_loans table
          const { error: insertError } = await supabase
            .from('closed_loans')
            .insert({
              loan_id: null, // No reference to original loans table for emergency loans
              customer_id: emergencyLoan.customer_id,
              customer_id_display: emergencyLoan.customer_id_display,
              customer_name: customer?.name || 'Unknown',
              loan_amount: emergencyLoan.loan_amount,
              interest_rate: 0,
              total_amount_paid: totalAmountPaid,
              balance_at_closure: balanceAtClosure,
              number_of_weeks: null,
              start_date: emergencyLoan.start_date,
              end_date: emergencyLoan.end_date,
              closure_date: new Date().toISOString().split('T')[0],
              team_leader_id: emergencyLoan.team_leader_id,
              team_leader_name: teamLeader?.name || 'Unknown',
              loan_purpose: 'emergency',
              weekly_batch: null,
              closure_reason: 'Automatically closed - Loan period expired',
              notes: emergencyLoan.notes
            })

          if (insertError) {
            console.error(`Error moving expired loan to closed_loans ${loan.id}:`, insertError)
            // Fallback: just update status
            await supabase
              .from('emergency_loans')
              .update({ status: 'closed' })
              .eq('id', loan.id)
          } else {
            // Delete from emergency_loans table after moving to closed_loans
            const { error: deleteError } = await supabase
              .from('emergency_loans')
              .delete()
              .eq('id', loan.id)

            if (deleteError) {
              console.error(`Error deleting emergency loan ${loan.id}:`, deleteError)
            } else {
              console.log(`Emergency loan ${loan.id} moved to closed_loans (expired)`)
            }
          }
        } catch (err) {
          console.error(`Unexpected error closing loan ${loan.id}:`, err)
        }
      }
      
      // Refresh data after moving loans
      loadData()
    }
  }

  // Show notifications for expiring loans
  const checkExpiringLoans = (processedLoans: EmergencyLoanData[]) => {
    const expiringLoans = processedLoans.filter(
      loan => loan.isExpiringSoon && loan.status === 'active'
    )
    
    expiringLoans.forEach(loan => {
      const customerName = loan.customer?.name || loan.customer_id
      // Use browser notification if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`⚠️ Emergency Loan Expiring Tomorrow`, {
          body: `Emergency Loan for ${customerName} is ending tomorrow.`,
          icon: '/favicon.ico'
        })
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(`⚠️ Emergency Loan Expiring Tomorrow`, {
              body: `Emergency Loan for ${customerName} is ending tomorrow.`,
              icon: '/favicon.ico'
            })
          }
        })
      }
    })
  }

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load emergency loans, customers, employees, and emergency collections in parallel
      const [loansRes, customersRes, employeesRes, emergencyCollectionsRes] = await Promise.all([
        supabase
          .from('emergency_loans')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('customers').select('*'),
        supabase.from('employees').select('*'),
        supabase
          .from('emergency_collections')
          .select('*')
          .order('collection_date', { ascending: false })
      ])

      if (loansRes.error) {
        console.error('Error loading emergency loans:', loansRes.error)
        setLoans([])
      } else {
        const loansData = loansRes.data || []
        const customersData = customersRes.data || []
        const employeesData = employeesRes.data || []

        // Map emergency_loans to Loan format with proper customer/team leader joins
        const loansWithCustomers = loansData.map(loan => {
          // Find customer by UUID
          const customer = customersData.find(c => c.id === loan.customer_id)
          
          // Find team leader by ID
          const teamLeader = employeesData.find(e => e.id === loan.team_leader_id)

          return {
            ...loan,
            // Map emergency_loans fields to Loan interface
            id: loan.id,
            customer_id: loan.customer_id_display || loan.customer_id?.toString() || '',
            amount: loan.loan_amount,
            loan_purpose: 'emergency',
            collection_amount: loan.due_amount,
            number_of_days: loan.number_of_days,
            customer: customer,
            team_leader: teamLeader,
            start_date: loan.start_date,
            end_date: loan.end_date,
            status: loan.status,
            created_at: loan.created_at,
            updated_at: loan.updated_at
          }
        })
        setLoans(loansWithCustomers as Loan[])
      }
      
      if (!customersRes.error) setCustomers(customersRes.data || [])
      if (!employeesRes.error) setEmployees(employeesRes.data || [])
      
      // Load emergency collections
      if (!emergencyCollectionsRes.error) {
        setEmergencyCollections(emergencyCollectionsRes.data || [])
      } else {
        // If table doesn't exist, try loading from regular collections with fallback pattern
        const fallbackRes = await supabase
          .from('collections')
          .select('*')
          .order('collection_date', { ascending: false })
        
        if (!fallbackRes.error && fallbackRes.data) {
          // Filter by emergency loan pattern in notes
          const fallbackCollections = fallbackRes.data.filter((c: any) => 
            c.notes && c.notes.includes('[EMERGENCY_LOAN:')
          )
          setEmergencyCollections(fallbackCollections)
        } else {
          setEmergencyCollections([])
        }
      }
    } catch (error) {
      console.error('Error loading emergency loans:', error)
      setLoans([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Set up interval to check for expired loans (every hour)
    const interval = setInterval(() => {
      loadData() // Refresh data every hour
    }, 3600000) // 1 hour

    return () => clearInterval(interval)
  }, [])

  // Process loans and check expiry
  const processedLoans = useMemo(() => {
    return processEmergencyLoans(loans)
  }, [loans])

  // Check and move expired loans when loans data changes
  useEffect(() => {
    if (processedLoans.length > 0) {
      checkAndMoveExpiredLoans(processedLoans)
      checkExpiringLoans(processedLoans)
    }
  }, [processedLoans])

  // Group loans by team leader
  const groupedByTeamLeader = useMemo(() => {
    const groups: Record<string, TeamLeaderGroup> = {}
    
    processedLoans.forEach(loan => {
      const teamLeaderId = loan.team_leader_id || 'unassigned'
      
      if (!groups[teamLeaderId]) {
        const teamLeader = employees.find(e => e.id === teamLeaderId) || null
        groups[teamLeaderId] = {
          teamLeader,
          loans: [],
          totalAmount: 0,
          activeCount: 0,
          closedCount: 0
        }
      }
      
      groups[teamLeaderId].loans.push(loan)
      groups[teamLeaderId].totalAmount += Number(loan.amount) || 0
      
      if (loan.status === 'active') {
        groups[teamLeaderId].activeCount++
      } else {
        groups[teamLeaderId].closedCount++
      }
    })
    
    return Object.values(groups)
  }, [processedLoans, employees])

  // Filter and sort loans
  const filteredAndSortedLoans = useMemo(() => {
    let filtered = processedLoans.filter(loan => {
      // Status filter
      if (filterStatus === 'active' && loan.status !== 'active') return false
      if (filterStatus === 'closed' && loan.status !== 'closed') return false
      
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const customerName = (loan.customer?.name || loan.customer_id || '').toLowerCase()
        const teamLeaderName = (loan.team_leader?.name || '').toLowerCase()
        
        if (!customerName.includes(search) && !teamLeaderName.includes(search)) {
          return false
        }
      }
      
      return true
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'remainingDays':
          return a.remainingDays - b.remainingDays // Soon-to-expire first
        case 'amount':
          return (Number(b.amount) || 0) - (Number(a.amount) || 0)
        case 'customer':
          const nameA = (a.customer?.name || a.customer_id || '').toLowerCase()
          const nameB = (b.customer?.name || b.customer_id || '').toLowerCase()
          return nameA.localeCompare(nameB)
        case 'teamLeader':
          const leaderA = (a.team_leader?.name || '').toLowerCase()
          const leaderB = (b.team_leader?.name || '').toLowerCase()
          return leaderA.localeCompare(leaderB)
        default:
          return 0
      }
    })

    return filtered
  }, [processedLoans, filterStatus, searchTerm, sortBy])

  // Summary statistics
  const summaryStats = useMemo(() => {
    const active = processedLoans.filter(l => l.status === 'active').length
    const closed = processedLoans.filter(l => l.status === 'closed').length
    const total = processedLoans.length
    
    return { total, active, closed }
  }, [processedLoans])

  // Toggle card expansion
  const toggleCard = (teamLeaderId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(teamLeaderId)) {
        next.delete(teamLeaderId)
      } else {
        next.add(teamLeaderId)
      }
      return next
    })
  }

  // Calculate EMI (if applicable)
  const calculateEMI = (loan: Loan): number => {
    const interestRate = parseFloat(loan.interest_rate || '8.33')
    const loanAmount = Number(loan.amount) || 0
    return (interestRate * loanAmount) / 100
  }

  // Get countdown badge color
  const getCountdownBadgeColor = (remainingDays: number, isExpired: boolean): string => {
    if (isExpired) return 'bg-gray-100 text-gray-700'
    if (remainingDays <= 1) return 'bg-red-100 text-red-800'
    if (remainingDays <= 2) return 'bg-orange-100 text-orange-800'
    return 'bg-blue-100 text-blue-800'
  }

  // Calculate pending customers for emergency loans (day-by-day tracking)
  const pendingEmergencyCustomers = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return processedLoans
      .filter(loan => loan.status === 'active')
      .map(loan => {
        const startDate = new Date(loan.start_date)
        startDate.setHours(0, 0, 0, 0)
        
        // Calculate how many days have passed since start
        const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // Get collections for this emergency loan, sorted by collection date
        const loanCollections = emergencyCollections
          .filter(c => (c.emergency_loan_id || c.loan_id) === loan.id)
          .sort((a, b) => new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime())
        
        // Calculate which day number should be collected next
        const nextDayNumber = loanCollections.length + 1
        
        // Calculate pending days (days that should have been collected but haven't)
        const pendingDays = Math.max(0, daysPassed - loanCollections.length)
        
        // Calculate pending amount (pending days * collection amount per day)
        const pendingAmount = pendingDays * loan.collectionAmount
        
        return {
          loan,
          nextDayNumber,
          pendingAmount,
          pendingDays,
          lastCollectionDate: loanCollections.length > 0 
            ? loanCollections[loanCollections.length - 1].collection_date
            : null,
          totalCollected: loanCollections.reduce((sum, c) => sum + (Number(c.amount_collected) || 0), 0)
        }
      })
      .filter(item => item.pendingDays > 0)
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
  }, [processedLoans, emergencyCollections])

  // Get emergency loan collections grouped by customer and team leader (mapped from state)
  const emergencyCollectionsList = useMemo(() => {
    // First, map and enrich collection data
    const enrichedCollections = emergencyCollections
      .map((c: any) => {
        // Map emergency_loan_id to loan_id for compatibility
        const emergencyLoanId = c.emergency_loan_id || c.loan_id
        const loan = processedLoans.find(l => l.id === emergencyLoanId)
        const customer = loan?.customer || customers.find((cust: any) => cust.id === c.customer_id)
        const teamLeader = loan?.team_leader || employees.find((emp: any) => emp.id === c.worker_id)
        
        return {
          ...c,
          loan_id: emergencyLoanId,
          loan,
          customer,
          team_leader: teamLeader,
          customer_name: customer?.name || loan?.customer_id || 'Unknown',
          team_leader_name: teamLeader?.name || 'Unassigned',
          amount_collected: Number(c.amount_collected) || 0,
          remaining_balance: Number(c.remaining_balance) || 0,
          day_number: Number(c.day_number) || 0,
          collection_date: c.collection_date
        }
      })
      .sort((a: any, b: any) => new Date(b.collection_date).getTime() - new Date(a.collection_date).getTime())

    // Group by customer name and team leader name
    const groupedMap = new Map<string, any>()
    
    enrichedCollections.forEach((collection: any) => {
      // Create a unique key for grouping: customer_name + team_leader_name + loan_id
      // This ensures collections from the same loan are grouped together
      const loanId = collection.loan_id || collection.emergency_loan_id || 'no-loan'
      const groupKey = `${collection.customer_name}|${collection.team_leader_name}|${loanId}`
      
      if (!groupedMap.has(groupKey)) {
        // First collection for this customer/team leader combination
        groupedMap.set(groupKey, {
          id: collection.id || `group-${groupKey}`,
          customer_name: collection.customer_name,
          team_leader_name: collection.team_leader_name,
          customer: collection.customer,
          team_leader: collection.team_leader,
          loan: collection.loan,
          collections: [collection],
          total_amount_collected: collection.amount_collected,
          remaining_balance: collection.remaining_balance, // Use latest balance
          earliest_date: collection.collection_date,
          latest_date: collection.collection_date,
          day_numbers: [collection.day_number].filter(d => d > 0),
          notes: collection.notes || ''
        })
      } else {
        // Add to existing group
        const group = groupedMap.get(groupKey)!
        group.collections.push(collection)
        group.total_amount_collected += collection.amount_collected
        // Update remaining balance only if this record is the latest by date
        const collectionDateForBalance = new Date(collection.collection_date)
        const latestDateForBalance = new Date(group.latest_date)
        if (collectionDateForBalance >= latestDateForBalance) {
          group.remaining_balance = collection.remaining_balance
        }
        
        // Update date range
        const collectionDate = new Date(collection.collection_date)
        const earliestDate = new Date(group.earliest_date)
        const latestDate = new Date(group.latest_date)
        
        if (collectionDate < earliestDate) {
          group.earliest_date = collection.collection_date
        }
        if (collectionDate > latestDate) {
          group.latest_date = collection.collection_date
        }
        
        // Add day number if not already present
        if (collection.day_number > 0 && !group.day_numbers.includes(collection.day_number)) {
          group.day_numbers.push(collection.day_number)
          group.day_numbers.sort((a: number, b: number) => a - b)
        }
        
        // Combine notes
        if (collection.notes && !group.notes.includes(collection.notes)) {
          group.notes = group.notes ? `${group.notes}; ${collection.notes}` : collection.notes
        }
      }
    })
    
    // Convert map to array and format for display
    return Array.from(groupedMap.values()).map((group: any) => {
      // Format day numbers (e.g., "Day 1-5" or "Day 1, 2, 3")
      let dayDisplay = ''
      if (group.day_numbers.length > 0) {
        if (group.day_numbers.length === 1) {
          dayDisplay = `Day ${group.day_numbers[0]}`
        } else {
          // Check if consecutive
          const sorted = [...group.day_numbers].sort((a: number, b: number) => a - b)
          let isConsecutive = true
          for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] !== sorted[i - 1] + 1) {
              isConsecutive = false
              break
            }
          }
          
          if (isConsecutive) {
            dayDisplay = `Day ${sorted[0]}-${sorted[sorted.length - 1]}`
          } else {
            dayDisplay = `Day ${sorted.join(', ')}`
          }
        }
      }
      
      // Format date range
      let dateDisplay = ''
      if (group.earliest_date === group.latest_date) {
        dateDisplay = formatDate(group.latest_date)
      } else {
        dateDisplay = `${formatDate(group.earliest_date)} - ${formatDate(group.latest_date)}`
      }
      
      const loanAmountNumber = Number(group.loan?.amount || 0)
      return {
        ...group,
        collection_date: dateDisplay, // Use formatted date range
        day_number: dayDisplay, // Use formatted day range
        amount_collected: group.total_amount_collected,
        collection_count: group.collections.length,
        // Robust total collected balance: loan amount + total collected in group
        total_collected_balance: loanAmountNumber + group.total_amount_collected
      }
    }).sort((a: any, b: any) => {
      // Sort by latest collection date (most recent first)
      return new Date(b.latest_date).getTime() - new Date(a.latest_date).getTime()
    })
  }, [emergencyCollections, processedLoans, customers, employees])

  // Handle edit loan
  const handleEditLoan = (loan: EmergencyLoanData) => {
    setLoanToEdit(loan)
    setShowCreateModal(true)
  }

  // Handle delete loan
  const handleDeleteLoan = async (loan: EmergencyLoanData) => {
    if (!confirm(`Are you sure you want to delete emergency loan for ${loan.customer?.name || loan.customer_id}? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('emergency_loans')
        .delete()
        .eq('id', loan.id)

      if (error) {
        alert(`Error deleting loan: ${error.message}`)
      } else {
        alert('Emergency loan deleted successfully')
        loadData()
      }
    } catch (err: any) {
      console.error('Error deleting loan:', err)
      alert('Error deleting loan. Please try again.')
    }
  }

  // Handle collection for emergency loan - collect total pending amount at once
  const handleCollectTotalPending = async (loan: EmergencyLoanData, pendingAmount: number, pendingDays: number, nextDayNumber: number) => {
    setCollectingLoanId(loan.id)
    
    try {
      const startDate = new Date(loan.start_date)
      startDate.setHours(0, 0, 0, 0)
      
      // Get all collections for this loan, sorted by collection date
      const loanCollections = emergencyCollections
        .filter(c => (c.emergency_loan_id || c.loan_id) === loan.id)
        .sort((a, b) => new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime())
      
      // Calculate which day number should be collected next (1-indexed)
      const currentDayNumber = loanCollections.length + 1
      
      // Confirm collection of total pending amount
      const confirmMessage = `Collect Total Pending Amount:\n\nCustomer: ${loan.customer?.name || loan.customer_id}\nPending Days: ${pendingDays}\nPending Amount: ${formatCurrency(pendingAmount)}\n\nThis will collect all ${pendingDays} pending days at once.\n\nConfirm collection?`
      
      if (!confirm(confirmMessage)) {
        return
      }

      // Get customer UUID
      let customerUUID = loan.customer?.id
      if (!customerUUID && loan.customer_id) {
        const customer = customers.find(c => c.customer_id_display === loan.customer_id || c.phone === loan.customer_id)
        customerUUID = customer?.id
      }

      if (!customerUUID) {
        alert('Error: Could not find customer UUID')
        return
      }

      // Calculate total collected so far
      const totalCollectedSoFar = loanCollections.reduce((sum, c) => sum + (Number(c.amount_collected) || 0), 0)
      
      // Insert collection records for all pending days
      const loanLimitDays = loan.loanLimitDays || (loan as any).number_of_days || 10
      const loanAmount = Number(loan.amount) || 0
      const collectionRecords = []
      
      for (let dayOffset = 0; dayOffset < pendingDays; dayOffset++) {
        const dayNumber = currentDayNumber + dayOffset
        if (dayNumber > loanLimitDays) break
        
        const collectionDate = new Date(startDate)
        collectionDate.setDate(collectionDate.getDate() + (dayNumber - 1))
        collectionDate.setHours(0, 0, 0, 0)
        
        // Calculate amount for this specific day
        const dayAmount = loan.collectionAmount
        const dayTotalCollected = totalCollectedSoFar + (dayAmount * (dayOffset + 1))
        const dayRemainingBalance = loanAmount + dayTotalCollected
        
        collectionRecords.push({
          emergency_loan_id: loan.id,
          customer_id: customerUUID,
          amount_collected: dayAmount,
          collection_date: collectionDate.toISOString().split('T')[0],
          status: 'completed',
          worker_id: loan.team_leader_id,
          remaining_balance: dayRemainingBalance,
          day_number: dayNumber,
          notes: `Emergency loan collection - Day ${dayNumber}/${loanLimitDays} (Bulk collection of ${pendingDays} days)`
        })
      }

      // Insert all collection records at once
      const { error: collectionError } = await supabase
        .from('emergency_collections')
        .insert(collectionRecords)

      if (collectionError) {
        alert(`Error collecting amount: ${collectionError.message}\n\nPlease make sure the emergency_collections table exists. Run the migration: supabase/migrations/20250105_create_emergency_collections.sql`)
        return
      }

      // Check if loan should be closed (all days collected)
      const finalDayNumber = currentDayNumber + pendingDays - 1
      if (finalDayNumber >= loanLimitDays) {
        await supabase
          .from('emergency_loans')
          .update({ status: 'closed' })
          .eq('id', loan.id)
      }

      alert(`Total pending amount collected successfully! Collected: ${formatCurrency(pendingAmount)} for ${pendingDays} days`)
      loadData()
    } catch (err: any) {
      console.error('Error collecting total pending amount:', err)
      alert('Error collecting amount. Please try again.')
    } finally {
      setCollectingLoanId(null)
    }
  }

  // Handle collection for emergency loan - collect one day at a time
  const handleCollectAmount = async (loan: EmergencyLoanData) => {
    setCollectingLoanId(loan.id)
    
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const startDate = new Date(loan.start_date)
      startDate.setHours(0, 0, 0, 0)
      
      // Get all collections for this loan, sorted by collection date
      const loanCollections = emergencyCollections
        .filter(c => (c.emergency_loan_id || c.loan_id) === loan.id)
        .sort((a, b) => new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime())
      
      // Calculate which day number should be collected next (1-indexed)
      const nextDayNumber = loanCollections.length + 1
      
      // Calculate the date for this day (start_date + (dayNumber - 1) days)
      const collectionDate = new Date(startDate)
      collectionDate.setDate(collectionDate.getDate() + (nextDayNumber - 1))
      collectionDate.setHours(0, 0, 0, 0)
      
      // Check if we've exceeded the loan limit days
      const loanLimitDays = loan.loanLimitDays || (loan as any).number_of_days || 10
      if (nextDayNumber > loanLimitDays) {
        alert('All collection days have been completed for this loan.')
        return
      }

      // Calculate if this day has already passed
      const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      if (nextDayNumber > daysPassed + 1) {
        alert(`Day ${nextDayNumber} collection is not due yet. Please collect previous days first.`)
        return
      }

      // Collect only one day's amount
      const dayAmount = loan.collectionAmount
      
      const confirmMessage = `Collect Day ${nextDayNumber} Amount:\n\nCustomer: ${loan.customer?.name || loan.customer_id}\nDay: ${nextDayNumber} of ${loanLimitDays}\nCollection Date: ${formatDate(collectionDate.toISOString())}\nAmount: ${formatCurrency(dayAmount)}\n\nConfirm collection?`
      
      if (!confirm(confirmMessage)) {
        return
      }

      // Get customer UUID
      let customerUUID = loan.customer?.id
      if (!customerUUID && loan.customer_id) {
        const customer = customers.find(c => c.customer_id_display === loan.customer_id || c.phone === loan.customer_id)
        customerUUID = customer?.id
      }

      if (!customerUUID) {
        alert('Error: Could not find customer UUID')
        return
      }

      // Calculate total collected so far (including this collection)
      const totalCollectedSoFar = loanCollections.reduce((sum, c) => sum + (Number(c.amount_collected) || 0), 0)
      const newTotalCollected = totalCollectedSoFar + dayAmount

      // Calculate remaining balance: loan_amount + total_collected_so_far
      // This shows the cumulative total that should be collected
      const loanAmount = Number(loan.amount) || 0
      const remainingBalance = loanAmount + newTotalCollected

      // Insert collection record for this specific day in emergency_collections table
      const { error: collectionError } = await supabase
        .from('emergency_collections')
        .insert({
          emergency_loan_id: loan.id,
          customer_id: customerUUID,
          amount_collected: dayAmount,
          collection_date: collectionDate.toISOString().split('T')[0],
          status: 'completed',
          worker_id: loan.team_leader_id,
          remaining_balance: remainingBalance,
          day_number: nextDayNumber,
          notes: `Emergency loan collection - Day ${nextDayNumber}/${loanLimitDays}`
        })

      if (collectionError) {
        alert(`Error collecting amount: ${collectionError.message}\n\nPlease make sure the emergency_collections table exists. Run the migration: supabase/migrations/20250105_create_emergency_collections.sql`)
        return
      }

      // Check if loan should be closed (all days collected)
      if (nextDayNumber >= loanLimitDays) {
        await supabase
          .from('emergency_loans')
          .update({ status: 'closed' })
          .eq('id', loan.id)
      }

      alert(`Day ${nextDayNumber} collection successful! Collected: ${formatCurrency(dayAmount)}`)
      loadData()
    } catch (err: any) {
      console.error('Error collecting amount:', err)
      alert('Error collecting amount. Please try again.')
    } finally {
      setCollectingLoanId(null)
    }
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack} 
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <Flame className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">Emergency Loans</h1>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Emergency Loan</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Emergency Loans Summary</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm opacity-90">Total Emergency Loans</p>
                <p className="text-3xl font-bold">{summaryStats.total}</p>
              </div>
              <div>
                <p className="text-sm opacity-90">Active Loans</p>
                <p className="text-3xl font-bold">{summaryStats.active}</p>
              </div>
              <div>
                <p className="text-sm opacity-90">Closed Loans</p>
                <p className="text-3xl font-bold">{summaryStats.closed}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collections Card */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
      
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                <div className="p-3 bg-gradient-to-br from-red-100 to-emerald-300 rounded-3xl shadow-lg flex-shrink-0 ml-2">
                <span className="w-6 h-6 text-green-600">₹</span>
                </div>
                <h1>  Collections</h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-600 text-white">
                  {emergencyCollectionsList.length}
                </span>
              </h2>
              <p className="text-sm text-gray-600">All emergency loan collections history</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {emergencyCollectionsList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No collections found
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Day</th>
                  <th className="py-3 pr-4 font-medium">Customer Name</th>
                  <th className="py-3 pr-4 font-medium">Team Leader</th>
                  <th className="py-3 pr-4 font-medium">Amount Collected</th>
                  <th className="py-3 pr-4 font-medium">Total Collected</th>
                  <th className="py-3 pr-4 font-medium">Notes</th>
                </tr>
              </thead>
                             <tbody className="divide-y">
                 {emergencyCollectionsList.map((collection) => (
                   <tr key={collection.id} className="hover:bg-gray-50">
                     <td className="py-3 pr-4 text-gray-700">
                       {collection.collection_date || '-'}
                     </td>
                     <td className="py-3 pr-4 font-semibold text-blue-600">
                       {collection.day_number || '-'}
                     </td>
                     <td className="py-3 pr-4 font-medium text-gray-900">
                       {collection.customer?.name || collection.customer_name || collection.loan?.customer_id || 'N/A'}
                       {collection.collection_count > 1 && (
                         <span className="ml-2 text-xs text-gray-500">({collection.collection_count} collections)</span>
                       )}
                     </td>
                     <td className="py-3 pr-4 text-gray-700">
                       {collection.team_leader?.name || collection.team_leader_name || collection.loan?.team_leader?.name || 'Unassigned'}
                     </td>
                     <td className="py-3 pr-4 font-semibold text-green-600">
                       {formatCurrency(collection.amount_collected)}
                     </td>
                      <td className="py-3 pr-4 font-semibold text-gray-700">
                        {formatCurrency(collection.total_collected_balance ?? collection.remaining_balance)}
                      </td>
                     <td className="py-3 pr-4 text-gray-600 text-xs">
                       {collection.notes || '-'}
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pending Customers Card */}
      {pendingEmergencyCustomers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  Pending Customers
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-600 text-white">
                    {pendingEmergencyCustomers.length}
                  </span>
                </h2>
                <p className="text-sm text-gray-600">Customers with outstanding emergency loan payments</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-3 pr-4 font-medium">Customer Name</th>
                  <th className="py-3 pr-4 font-medium">Team Leader</th>
                  <th className="py-3 pr-4 font-medium">Next Day to Collect</th>
                  <th className="py-3 pr-4 font-medium">Pending Days</th>
                  <th className="py-3 pr-4 font-medium">Pending Amount</th>
                  <th className="py-3 pr-4 font-medium">Last Collection</th>
                  <th className="py-3 pr-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingEmergencyCustomers.map((item) => (
                  <tr key={item.loan.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      {item.loan.customer?.name || item.loan.customer_id}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {item.loan.team_leader?.name || 'Unassigned'}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-blue-600">
                      Day {item.nextDayNumber}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {item.pendingDays} days
                    </td>
                    <td className="py-3 pr-4 font-semibold text-red-600">
                      {formatCurrency(item.pendingAmount)}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {item.lastCollectionDate 
                        ? formatDate(item.lastCollectionDate)
                        : 'No collection yet'}
                    </td>
                                         <td className="py-3 pr-4">
                       <button
                         onClick={() => handleCollectTotalPending(item.loan, item.pendingAmount, item.pendingDays, item.nextDayNumber)}
                         disabled={collectingLoanId === item.loan.id}
                         className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs font-semibold rounded transition-colors duration-200"
                       >
                         {collectingLoanId === item.loan.id ? 'Collecting...' : 'Collect Total'}
                       </button>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by customer name or team leader..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          
          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="remainingDays">Sort by Remaining Days</option>
            <option value="amount">Sort by Amount</option>
            <option value="customer">Sort by Customer</option>
            <option value="teamLeader">Sort by Team Leader</option>
          </select>
        </div>
      </div>

      {/* Emergency Loans Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading emergency loans...</div>
      ) : filteredAndSortedLoans.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No emergency loans found.</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Leader
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collection Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collection
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedLoans.map((loan) => {
                  return (
                    <tr
                      key={loan.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        loan.status === 'active' ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Flame className="w-4 h-4 text-red-600" />
                          <span
                            className={`font-medium ${
                              loan.status === 'active' ? 'text-red-700' : 'text-gray-600'
                            }`}
                          >
                            {loan.customer?.name || loan.customer_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {loan.team_leader?.name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(Number(loan.amount) || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(loan.collectionAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(loan.created_at || loan.start_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {loan.loanLimitDays} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getCountdownBadgeColor(
                            loan.remainingDays,
                            loan.isExpired
                          )}`}
                        >
                          {loan.isExpired ? (
                            <span className="flex items-center space-x-1">
                              <XCircle className="w-3 h-3" />
                              <span>Expired</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{loan.remainingDays} days</span>
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            loan.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {loan.status === 'active' ? 'Active' : 'Closed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {loan.status === 'active' && (() => {
                          const loanCollections = emergencyCollections.filter(c => 
                            (c.emergency_loan_id || c.loan_id) === loan.id
                          )
                          const nextDayNumber = loanCollections.length + 1
                          const loanLimitDays = loan.loanLimitDays || (loan as any).number_of_days || 10
                          const canCollect = nextDayNumber <= loanLimitDays
                          
                          return canCollect ? (
                            <button
                              onClick={() => handleCollectAmount(loan)}
                              disabled={collectingLoanId === loan.id}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                              {collectingLoanId === loan.id ? 'Collecting...' : `Collect Day ${nextDayNumber}`}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500">Completed</span>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedLoan(loan)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditLoan(loan)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Edit Loan"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLoan(loan)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Loan"
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

      {/* Loan Detail Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Flame className="w-6 h-6 text-red-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Emergency Loan Details</h2>
                </div>
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Customer Info */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-900 mb-2 flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Customer Information</span>
                </h3>
                <p className="text-red-800 font-medium">
                  {selectedLoan.customer?.name || selectedLoan.customer_id}
                </p>
                <p className="text-sm text-red-700">
                  Phone: {selectedLoan.customer?.phone || 'N/A'}
                </p>
              </div>

              {/* Loan Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Loan Amount</p>
                  <p className="text-xl font-bold text-gray-900">{formatNumber(Number(selectedLoan.amount) || 0)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Collection Amount</p>
                  <p className="text-xl font-bold text-gray-900">{formatNumber(selectedLoan.collectionAmount)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Loan Limit</p>
                  <p className="text-xl font-bold text-gray-900">{selectedLoan.loanLimitDays} days</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(selectedLoan.created_at || selectedLoan.start_date)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Remaining Days</p>
                  <p className={`text-xl font-bold ${
                    selectedLoan.isExpired ? 'text-gray-600' : 
                    selectedLoan.remainingDays <= 1 ? 'text-red-600' :
                    selectedLoan.remainingDays <= 2 ? 'text-orange-600' : 'text-blue-600'
                  }`}>
                    {selectedLoan.isExpired ? 'Expired' : `${selectedLoan.remainingDays} days`}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Status</p>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedLoan.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {selectedLoan.status === 'active' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-1" />
                      Closed
                    </>
                  )}
                </span>
              </div>

              {/* Team Leader */}
              {selectedLoan.team_leader && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Team Leader</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedLoan.team_leader.name}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedLoan(null)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Emergency Loan Modal */}
      {showCreateModal && (
        <EmergencyLoanApplication
          onClose={() => {
            setShowCreateModal(false)
            setLoanToEdit(null)
            loadData() // Refresh data when modal closes
          }}
          onSuccess={() => {
            setShowCreateModal(false)
            setLoanToEdit(null)
            loadData() // Refresh data after successful creation
          }}
          initialData={loanToEdit ? {
            customer_id: loanToEdit.customer_id,
            customer_name: loanToEdit.customer?.name || '',
            mobile_number: loanToEdit.customer?.phone || '',
            relationship: loanToEdit.customer?.relationship || '',
            aadhaar_number: loanToEdit.customer?.aadhaar_number || '',
            pan_number: loanToEdit.customer?.pan_number || '',
            address: loanToEdit.customer?.address || '',
            team_leader_id: loanToEdit.team_leader_id || '',
            loan_amount: String(loanToEdit.amount || 0),
            due_amount: String(loanToEdit.collectionAmount || 0),
            number_of_days: String((loanToEdit as any).number_of_days || loanToEdit.loanLimitDays || 0),
            start_date: loanToEdit.start_date || '',
            end_date: loanToEdit.end_date || '',
            loanId: loanToEdit.id // Pass loan ID for editing
          } : undefined}
        />
      )}
    </div>
  )
}