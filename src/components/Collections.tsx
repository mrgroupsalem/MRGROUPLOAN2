  'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { 
  ArrowLeft,
  Download, 
  RefreshCw,
  TrendingUp,
  CreditCard,
  IndianRupee,
  FileText,
  Users,
  Calendar,
  User,
  X,
  Search
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { exportCollections } from '@/lib/exportUtils'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { Collection, Loan, Customer, Employee } from '@/types'
import { getLoanDisplayId } from '@/lib/loanIdGenerator'
import { generateDueSchedule } from '@/lib/dueSchedule'
import CustomerNameLink from '@/components/ui/CustomerNameLink'

interface CollectionsProps {
  onBack: () => void
}

type WeeklyBatch = 'tuesday' | 'thursday' | 'friday'

export default function Collections({ onBack }: CollectionsProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingCustomersFromDB, setPendingCustomersFromDB] = useState<Record<string, { count: number, emi: number }>>({})
  const [showBatchCollectionModal, setShowBatchCollectionModal] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<WeeklyBatch | null>(null)
  const [selectedCustomers, setSelectedCustomers] = useState<Record<string, boolean>>({})
  const [isCollecting, setIsCollecting] = useState(false)
  const [collectingCustomerId, setCollectingCustomerId] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [workerFilter, setWorkerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'partial' | 'pending'>('all')
  const [batchFilter, setBatchFilter] = useState<'all' | 'tuesday' | 'thursday' | 'friday'>('all')
  const [pendingBatchFilter, setPendingBatchFilter] = useState<'' | WeeklyBatch>('')

  // Initial load
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [collRes, loansRes, custRes, empRes, pendingRes] = await Promise.all([
          supabase
            .from('collections')
            .select(`*, loan:loans(*, customer:customers(*)), customer:customers(*), worker:employees(*)`)
            .order('collection_date', { ascending: false }),
          supabase.from('loans').select(`*, team_leader:employees(*)`),
          supabase.from('customers').select(`*`),
          supabase.from('employees').select(`*`),
          supabase.from('pending_customers').select('loan_id, pending_count, emi_amount')
        ])

        const allCustomers = custRes.data || []
        if (!collRes.error) {
          const enrichedCols = (collRes.data || []).map((c: any) => {
            const cust = c.customer || c.loan?.customer || allCustomers.find((u: any) => u.id === c.customer_id)
            return {
              ...c,
              customer: cust
            }
          })
          setCollections(enrichedCols)
        }
        if (!loansRes.error) {
          // Manually join customer data with loans - use customer_id from loan to match with customer.id
          const loansWithCustomers = (loansRes.data || []).map(loan => {
            const customer = allCustomers.find(c => c.id === loan.customer_id)
            return { ...loan, customer }
          })
          setLoans(loansWithCustomers)
        }
        if (!custRes.error) setCustomers(allCustomers)
        if (!empRes.error) setEmployees(empRes.data || [])
        
        // Load pending customers from database
        if (!pendingRes.error) {
          const map: Record<string, { count: number, emi: number }> = {}
          ;(pendingRes.data || []).forEach(r => { 
            if (Number(r.pending_count || 0) > 0) {
              map[r.loan_id] = { count: Number(r.pending_count || 0), emi: Number(r.emi_amount || 0) } 
            }
          })
          setPendingCustomersFromDB(map)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Helper function to get customer UUID
  const getCustomerUUID = async (customerId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('customer_id_display', customerId)
        .single()
      
      if (error) {
        console.error('Error fetching customer UUID:', error)
        return null
      }
      
      return data?.id || null
    } catch (error) {
      console.error('Error in getCustomerUUID:', error)
      return null
    }
  }

  const refreshAll = async () => {
    try {
      setLoading(true)
      const [collRes, loansRes, custRes, empRes, pendingRes] = await Promise.all([
        supabase
          .from('collections')
          .select(`*, loan:loans(*, customer:customers(*)), customer:customers(*), worker:employees(*)`)
          .order('collection_date', { ascending: false }),
        supabase.from('loans').select(`*, team_leader:employees(*)`),
        supabase.from('customers').select(`*`),
        supabase.from('employees').select(`*`),
        supabase.from('pending_customers').select('loan_id, pending_count, emi_amount')
      ])
      const allCustomers = custRes.data || []
      if (!collRes.error) {
        const enrichedCols = (collRes.data || []).map((c: any) => {
          const cust = c.customer || c.loan?.customer || allCustomers.find((u: any) => u.id === c.customer_id)
          return {
            ...c,
            customer: cust
          }
        })
        setCollections(enrichedCols)
      }
      if (!loansRes.error) {
        // Manually join customer data with loans - use customer_id from loan to match with customer.id
        const loansWithCustomers = (loansRes.data || []).map(loan => {
          const customer = allCustomers.find(c => c.id === loan.customer_id)
          return { ...loan, customer }
        })
        setLoans(loansWithCustomers)
      }
      if (!custRes.error) setCustomers(allCustomers)
      if (!empRes.error) setEmployees(empRes.data || [])
      if (!pendingRes.error) {
        const map: Record<string, { count: number, emi: number }> = {}
        ;(pendingRes.data || []).forEach(r => { 
          if (Number(r.pending_count || 0) > 0) {
            map[r.loan_id] = { count: Number(r.pending_count || 0), emi: Number(r.emi_amount || 0) } 
          }
        })
        setPendingCustomersFromDB(map)
      }
    } finally {
      setLoading(false)
    }
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

  // Helpers
  const calculateCurrentLoanBalance = (loanId: string): number => {
    const loan = loans.find(l => l.id === loanId)
    if (!loan) return 0
    
    // Calculate total loan amount using new EMI formula
    const totalLoanAmount = calculateTotalPayable(loan)
    
    // Calculate remaining balance
    const totalCollected = collections.filter(c => c.loan_id === loanId).reduce((s, c) => s + (Number(c.amount_collected) || 0), 0)
    return Math.max(0, totalLoanAmount - totalCollected)
  }

  const getWorkerName = (teamLeaderId?: string) => {
    if (!teamLeaderId) return 'Unassigned'
    const emp = employees.find(e => e.id === teamLeaderId)
    return emp?.name || 'Unassigned'
  }

  const getCurrentWeekRange = () => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  const calculateWeeklyEMI = (loan: Loan) => {
    // Weekly EMI = Total Interest (EMI) - they are the same
    const emi = calculateEMI(loan)
    return emi
  }

  // Calculate weekly batch data (like Dashboard)
  const weeklyBatchData = useMemo(() => {
    const batches = {
      tuesday: { totalAmount: 0, customerCount: 0, loans: [] as Loan[] },
      thursday: { totalAmount: 0, customerCount: 0, loans: [] as Loan[] },
      friday: { totalAmount: 0, customerCount: 0, loans: [] as Loan[] }
    }

    // Get current week range
    const { start, end } = getCurrentWeekRange()
    const withinWeek = (d: string | Date) => {
      const ts = new Date(d).getTime()
      return ts >= start.getTime() && ts <= end.getTime()
    }

    // Process each loan
    loans.forEach(loan => {
      if (!loan.weekly_batch || !['tuesday', 'thursday', 'friday'].includes(loan.weekly_batch)) return
      
      const batch = batches[loan.weekly_batch as WeeklyBatch]
      batch.loans.push(loan)
      
      // Calculate weekly EMI using proper interest rate calculation
      const weeklyEmi = calculateWeeklyEMI(loan)
      batch.totalAmount += weeklyEmi
      
      // Check if this loan has collections this week
      const hasWeekCollection = collections.some(c => c.loan_id === loan.id && withinWeek(c.collection_date))
      if (!hasWeekCollection) {
        batch.customerCount += 1
      }
    })

    return batches
  }, [loans, collections])

  // Pending customers from database (like Dashboard)
  const pendingCustomers = useMemo(() => {
    const map: { loan: Loan; weeklyBatch?: WeeklyBatch; count: number; emi: number }[] = []
    
    Object.entries(pendingCustomersFromDB).forEach(([loanId, data]) => {
      const loan = loans.find(l => l.id === loanId)
      if (loan && data.count > 0) {
        map.push({ 
          loan, 
          weeklyBatch: (loan.weekly_batch || '') as WeeklyBatch,
          count: data.count,
          emi: data.emi
        })
      }
    })
    
    return map
  }, [loans, pendingCustomersFromDB])

  const displayPending = useMemo(() => {
    let list = pendingCustomers
    if (pendingBatchFilter) list = list.filter(p => (p.loan.weekly_batch || '') === pendingBatchFilter)
    return list
  }, [pendingCustomers, pendingBatchFilter])

  // Summary counts
  const totalCollectedAmount = useMemo(() => collections.reduce((s, c) => s + (Number(c.amount_collected) || 0), 0), [collections])
  const totalPendingBalance = useMemo(() => loans.reduce((s, l) => s + calculateCurrentLoanBalance(l.id), 0), [loans, collections])
  const completionRate = useMemo(() => {
    if (collections.length === 0) return 0
    const completed = collections.filter(c => (c.status || '').toLowerCase() === 'completed').length
    return Math.round((completed / collections.length) * 100)
  }, [collections])

  // Actions
  const handleExport = () => {
    try {
      const enrichedForExport = filteredCollections.map((c) => {
        const displayId = collectionDisplayIdMap.get(c.id) || c.id
        const customer = c.customer || c.loan?.customer
        const dueInfo = collectionDueNoMap.get(c.id)
        const remaining = collectionRemainingMap.get(c.id) ?? (Number(c.remaining_balance) || 0)
        return {
          ...c,
          displayId,
          customer,
          dueInfoStr: dueInfo ? `${dueInfo.installmentNumber}/${dueInfo.totalWeeks}${dueInfo.isPartial ? ' (partial)' : ''}` : '—',
          remainingAmount: remaining,
        }
      })
      exportCollections(enrichedForExport)
    } catch (e) {
      console.error('Export error:', e)
    }
  }

  const handleCollectAmount = (batch: WeeklyBatch) => {
    setSelectedBatch(batch)
    setSelectedCustomers({})
    setShowBatchCollectionModal(true)
  }

  const getBatchCustomers = (batch: WeeklyBatch) => {
    return loans.filter(loan => loan.weekly_batch === batch && loan.status === 'active')
  }

  const toggleSelectAll = () => {
    if (!selectedBatch) return
    
    const batchCustomers = getBatchCustomers(selectedBatch)
    const allSelected = batchCustomers.every(loan => selectedCustomers[loan.id])
    
    if (allSelected) {
      // Unselect all
      setSelectedCustomers({})
    } else {
      // Select all
      const newSelection: Record<string, boolean> = {}
      batchCustomers.forEach(loan => {
        newSelection[loan.id] = true
      })
      setSelectedCustomers(newSelection)
    }
  }

  const toggleCustomerSelection = (loanId: string) => {
    setSelectedCustomers(prev => ({
      ...prev,
      [loanId]: !prev[loanId]
    }))
  }

  const handleIndividualCollection = async (loanId: string) => {
    const loan = loans.find(l => l.id === loanId)
    if (!loan) return
    
    setCollectingCustomerId(loanId)
    try {
      const weeklyEmi = calculateWeeklyEMI(loan)
      const totalAmount = weeklyEmi * (pendingCustomersFromDB[loanId]?.count || 1)
      
      // Confirm collection
      const confirmMessage = `Confirm Collection:

Customer: ${loan.customer?.name || loan.customer_id}
Amount: ${formatCurrency(totalAmount)}
Count: ${pendingCustomersFromDB[loanId]?.count || 1} × ${formatCurrency(weeklyEmi)}

This will remove the customer from pending list.`
      if (!confirm(confirmMessage)) {
        return
      }
      
      // Calculate total loan amount using new EMI formula
      const totalLoanAmount = calculateTotalPayable(loan)
      
      // Calculate remaining balance after this collection
      const collectedSoFar = collections
        .filter(c => c.loan_id === loanId)
        .reduce((s, c) => s + (Number(c.amount_collected) || 0), 0)
      const remainingBalance = Math.max(0, totalLoanAmount - collectedSoFar - totalAmount)
      
      // Get customer UUID for collection record
      let customerUUID = loan.customer?.id
      if (!customerUUID) {
        const uuid = await getCustomerUUID(loan.customer_id)
        if (!uuid) {
          alert(`Error: Could not find customer UUID for ${loan.customer?.name || loan.customer_id}`)
          return
        }
        customerUUID = uuid
      }
      
      // Insert collection record
      const { error: collectionError } = await supabase
        .from('collections')
        .insert({
          loan_id: loanId,
          customer_id: customerUUID!, // Use customer UUID
          amount_collected: totalAmount,
          collection_date: new Date().toISOString(),
          due_date: new Date().toISOString().split('T')[0],
          status: 'completed',
          worker_id: loan.team_leader_id,
          remaining_balance: remainingBalance,
          notes: `Individual collection - ${loan.customer?.name || loan.customer_id}`
        })

      if (collectionError) {
        console.error('Error inserting collection:', collectionError)
        alert(`Error collecting amount: ${collectionError.message}`)
        return
      }

      // Check if loan should be closed (remaining balance = 0)
      if (remainingBalance <= 0) {
        const { error: closeError } = await supabase
          .from('loans')
          .update({ status: 'closed' })
          .eq('id', loanId)
        
        if (closeError) {
          console.error('Error closing loan:', closeError)
          alert(`Warning: Collection successful but failed to close loan: ${closeError.message}`)
        } else {
          console.log(`Loan ${loanId} closed - customer has paid full amount`)
          // Notify other components that a loan status has changed
          const bc = new BroadcastChannel('collections')
          bc.postMessage({
            type: 'loan-status-changed',
            loanId: loanId,
            newStatus: 'closed'
          })
          bc.close()
        }
      }

      // Delete customer from pending_customers table
      const { error: deleteError } = await supabase
        .from('pending_customers')
        .delete()
        .eq('loan_id', loanId)
      
      if (deleteError) {
        console.error('Error deleting pending customer:', deleteError)
        alert(`Warning: Collection successful but failed to remove from pending list: ${deleteError.message}`)
      }

      // Update local state immediately to remove from UI
      setPendingCustomersFromDB(prev => {
        const next = { ...prev }
        delete next[loanId]
        return next
      })
      
      // Refresh all data to ensure consistency
      await refreshAll()
      
      // Send broadcast to Dashboard about collection update
      try {
        const bc = new BroadcastChannel('collections')
        bc.postMessage({
          type: 'individual-collection-updated',
          loanId: loanId,
          customerName: loan.customer?.name || loan.customer_id,
          amount: totalAmount,
          timestamp: new Date().toISOString()
        })
        bc.close()
      } catch (error) {
        console.error('Error sending broadcast:', error)
      }
      
      alert(`Collection completed successfully!\nCustomer: ${loan.customer?.name || loan.customer_id}\nAmount: ${formatCurrency(totalAmount)}`)
      
    } catch (error) {
      console.error('Error processing individual collection:', error)
      alert('Error processing collection. Please try again.')
    } finally {
      setCollectingCustomerId(null)
    }
  }

  const handleBatchCollection = async () => {
    if (!selectedBatch) return
    
    setIsCollecting(true)
    try {
      const batchCustomers = getBatchCustomers(selectedBatch)
      const selectedLoanIds = Object.keys(selectedCustomers).filter(id => selectedCustomers[id])
      const unselectedLoanIds = batchCustomers
        .filter(loan => !selectedCustomers[loan.id])
        .map(loan => loan.id)

      // Process collected customers (selected)
      for (const loanId of selectedLoanIds) {
        const loan = loans.find(l => l.id === loanId)
        if (!loan) continue

        const weeklyEmi = calculateWeeklyEMI(loan)
        
        // Calculate total loan amount using new EMI formula
        const totalLoanAmount = calculateTotalPayable(loan)
        
        // Calculate remaining balance after this collection
        const collectedSoFar = collections
          .filter(c => c.loan_id === loanId)
          .reduce((s, c) => s + (Number(c.amount_collected) || 0), 0)
        const remainingBalance = Math.max(0, totalLoanAmount - collectedSoFar - weeklyEmi)
        
        // Get customer UUID for collection record
        let customerUUID = loan.customer?.id
        if (!customerUUID) {
          const uuid = await getCustomerUUID(loan.customer_id)
          if (!uuid) {
            console.error(`Could not find customer UUID for ${loan.customer?.name || loan.customer_id}`)
            continue // Skip this loan and continue with others
          }
          customerUUID = uuid
        }
        
        // Insert collection record
        const { error: collectionError } = await supabase
          .from('collections')
          .insert({
            loan_id: loanId,
            customer_id: customerUUID!, // Use customer UUID
            amount_collected: weeklyEmi,
            collection_date: new Date().toISOString(),
            due_date: new Date().toISOString().split('T')[0],
            status: 'completed',
            worker_id: loan.team_leader_id,
            remaining_balance: remainingBalance,
            notes: `Batch collection - ${selectedBatch}`
          })

        if (collectionError) {
          console.error('Error inserting collection:', collectionError)
        } else {
          // Check if loan should be closed (remaining balance = 0)
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
        }
      }

      // Process pending customers (unselected)
      for (const loanId of unselectedLoanIds) {
        const loan = loans.find(l => l.id === loanId)
        if (!loan) continue

        const weeklyEmi = calculateWeeklyEMI(loan)
        
        // Update or insert pending customer record
        const { error: pendingError } = await supabase
          .from('pending_customers')
          .upsert({
            loan_id: loanId,
            pending_count: 1,
            emi_amount: weeklyEmi,
            checked: false,
            created_at: new Date().toISOString()
          })

        if (pendingError) {
          console.error('Error updating pending customer:', pendingError)
        }
      }

      // Refresh all data
      await refreshAll()
      
      // Send broadcast to Dashboard about batch collection update
      try {
        const bc = new BroadcastChannel('collections')
        bc.postMessage({
          type: 'batch-collection-updated',
          batch: selectedBatch,
          collectedCount: selectedLoanIds.length,
          pendingCount: unselectedLoanIds.length,
          timestamp: new Date().toISOString()
        })
        bc.close()
      } catch (error) {
        console.error('Error sending broadcast:', error)
      }
      
      // Close modal
      setShowBatchCollectionModal(false)
      setSelectedBatch(null)
      setSelectedCustomers({})
      
      alert(`Batch collection completed!\nCollected: ${selectedLoanIds.length} customers\nPending: ${unselectedLoanIds.length} customers`)
      
    } catch (error) {
      console.error('Error processing batch collection:', error)
      alert('Error processing batch collection. Please try again.')
    } finally {
      setIsCollecting(false)
    }
  }

  const recalculateAllRemainingBalances = async () => {
    try {
      for (const l of loans) {
        const totalAmount = Number((l as any).total_payable || (l as any).total_payable_amount || (l as any).total_amount) || calculateTotalPayable(l)
        const sorted = collections.filter(c => c.loan_id === l.id).sort((a, b) => new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime())
        let collected = 0
        for (const c of sorted) {
          collected += Number(c.amount_collected) || 0
          const remaining = Math.max(0, totalAmount - collected)
          await supabase.from('collections').update({ remaining_balance: remaining }).eq('id', c.id)
        }
      }
      const { data } = await supabase
        .from('collections')
        .select(`*, loan:loans(*, customer:customers(*)), customer:customers(*), worker:employees(*)`)
        .order('collection_date', { ascending: false })
      const allCustomers = customers
      const enrichedCols = (data || []).map((c: any) => {
        const cust = c.customer || c.loan?.customer || allCustomers.find((u: any) => u.id === c.customer_id)
        return {
          ...c,
          customer: cust
        }
      })
      setCollections(enrichedCols)
      alert('All remaining balances have been recalculated successfully!')
    } catch (e) {
      console.error(e)
      alert('Error recalculating remaining balances.')
    }
  }

  // 1. Continuous running sequence Collection ID per customer (Option A: e.g. 47526010122-001, -002, -003)
  const collectionDisplayIdMap = useMemo(() => {
    const map = new Map<string, string>()
    const byCustomer = new Map<string, Collection[]>()

    collections.forEach((c) => {
      const custId =
        c.customer?.customer_id_display ||
        c.loan?.customer?.customer_id_display ||
        (c.customer_id ? String(c.customer_id) : '') ||
        'COL'
      if (!byCustomer.has(custId)) byCustomer.set(custId, [])
      byCustomer.get(custId)!.push(c)
    })

    byCustomer.forEach((custCols, custId) => {
      const sorted = [...custCols].sort((a, b) => {
        const dateA = new Date(a.collection_date || 0).getTime()
        const dateB = new Date(b.collection_date || 0).getTime()
        if (dateA !== dateB) return dateA - dateB
        const createdA = new Date(a.created_at || 0).getTime()
        const createdB = new Date(b.created_at || 0).getTime()
        if (createdA !== createdB) return createdA - createdB
        return String(a.id).localeCompare(String(b.id))
      })

      sorted.forEach((c, idx) => {
        const seq = String(idx + 1).padStart(3, '0')
        map.set(c.id, `${custId}-${seq}`)
      })
    })

    return map
  }, [collections])

  // 2. Remaining balance per collection: Total Payable minus cumulative collected up to and including this record
  const collectionRemainingMap = useMemo(() => {
    const map = new Map<string, number>()
    const byLoan = new Map<string, Collection[]>()

    collections.forEach((c) => {
      const loanId = c.loan_id
      if (!loanId) return
      if (!byLoan.has(loanId)) byLoan.set(loanId, [])
      byLoan.get(loanId)!.push(c)
    })

    byLoan.forEach((loanCols, loanId) => {
      const loan = loans.find((l) => l.id === loanId) || loanCols[0]?.loan
      const totalPayable = loan
        ? Number(
            (loan as any).total_payable ||
            (loan as any).total_payable_amount ||
            (loan as any).total_amount
          ) || calculateTotalPayable(loan)
        : 0

      const sorted = [...loanCols].sort((a, b) => {
        const dateA = new Date(a.collection_date || 0).getTime()
        const dateB = new Date(b.collection_date || 0).getTime()
        if (dateA !== dateB) return dateA - dateB
        const createdA = new Date(a.created_at || 0).getTime()
        const createdB = new Date(b.created_at || 0).getTime()
        if (createdA !== createdB) return createdA - createdB
        return String(a.id).localeCompare(String(b.id))
      })

      let running = 0
      sorted.forEach((c) => {
        running += Number(c.amount_collected) || 0
        const rem = Math.max(0, totalPayable - running)
        map.set(c.id, rem)
      })
    })

    return map
  }, [collections, loans])

  // 3. Due No mapping with schedule / FIFO
  const collectionDueNoMap = useMemo(() => {
    const map = new Map<
      string,
      { installmentNumber: number; totalWeeks: number; isPartial: boolean; dueDateStr?: string }
    >()
    const byLoan = new Map<string, Collection[]>()

    collections.forEach((c) => {
      const loanId = c.loan_id
      if (!loanId) return
      if (!byLoan.has(loanId)) byLoan.set(loanId, [])
      byLoan.get(loanId)!.push(c)
    })

    byLoan.forEach((loanCols, loanId) => {
      const loan = loans.find((l) => l.id === loanId) || loanCols[0]?.loan
      const totalWeeks = loan?.number_of_weeks || 15
      const schedule = loan?.start_date
        ? generateDueSchedule(loan.start_date, loan.weekly_batch, totalWeeks, loan.end_date)
        : []

      const sorted = [...loanCols].sort((a, b) => {
        const dateA = new Date(a.collection_date || 0).getTime()
        const dateB = new Date(b.collection_date || 0).getTime()
        if (dateA !== dateB) return dateA - dateB
        const createdA = new Date(a.created_at || 0).getTime()
        const createdB = new Date(b.created_at || 0).getTime()
        if (createdA !== createdB) return createdA - createdB
        return String(a.id).localeCompare(String(b.id))
      })

      sorted.forEach((c, idx) => {
        let installmentNumber = idx + 1
        let matchedDueDate = c.due_date

        if (c.due_date && schedule.length > 0) {
          const cDueClean = String(c.due_date).slice(0, 10)
          const foundIdx = schedule.findIndex((d) => d === cDueClean)
          if (foundIdx !== -1) {
            installmentNumber = foundIdx + 1
          }
        }

        const isPartial = (c.status || '').toLowerCase() === 'partial'
        map.set(c.id, {
          installmentNumber,
          totalWeeks,
          isPartial,
          dueDateStr: matchedDueDate || undefined,
        })
      })
    })

    return map
  }, [collections, loans])

  // Filters for table
  const filteredCollections = useMemo(() => {
    let list = [...collections]
    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim()
      list = list.filter((c) => {
        const displayId = collectionDisplayIdMap.get(c.id) || ''
        const custDisplayId = c.customer?.customer_id_display || c.loan?.customer?.customer_id_display || ''
        const custName = c.customer?.name || c.loan?.customer?.name || ''
        const custPhone = c.customer?.phone || c.loan?.customer?.phone || ''
        const loanDisplayId = c.loan?.loan_id_display || getLoanDisplayId(c.loan) || ''
        return (
          c.id.toLowerCase().includes(q) ||
          displayId.toLowerCase().includes(q) ||
          custDisplayId.toLowerCase().includes(q) ||
          custName.toLowerCase().includes(q) ||
          custPhone.includes(q) ||
          loanDisplayId.toLowerCase().includes(q)
        )
      })
    }
    if (dateFilter) list = list.filter((c) => String(c.collection_date).slice(0, 10) === dateFilter)
    if (workerFilter) list = list.filter((c) => (c.worker?.id || c.worker_id) === workerFilter)
    if (statusFilter !== 'all') list = list.filter((c) => (c.status || '').toLowerCase() === statusFilter)
    if (batchFilter !== 'all') list = list.filter((c) => (c.loan?.weekly_batch || '').toLowerCase() === batchFilter.toLowerCase())
    return list
  }, [collections, searchTerm, dateFilter, workerFilter, statusFilter, batchFilter, collectionDisplayIdMap])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[100vw] overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button onClick={onBack} className="inline-flex items-center gap-2 px-3 py-2 border rounded text-sm text-gray-700 hover:bg-gray-50 self-start sm:self-auto">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={recalculateAllRemainingBalances} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
            <TrendingUp className="w-4 h-4" /> <span className="hidden sm:inline">Recalculate Balances</span><span className="sm:hidden">Recalculate</span>
          </button>
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div> 

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        <div className="group bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 shadow-lg border border-blue-200 hover:shadow-xl transition-all duration-300 h-full">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-700 mb-1">Total Collections</div>
              <div className="text-3xl font-bold text-blue-900">{collections.length}</div>
              <div className="text-xs text-blue-600 mt-1">All time records</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        
        <div className="group bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl p-6 shadow-lg border border-emerald-200 hover:shadow-xl transition-all duration-300 h-full">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-emerald-700 mb-1">Amount Collected</div>
              <div className="text-3xl font-bold text-emerald-900">{formatCurrency(totalCollectedAmount)}</div>
              <div className="text-xs text-emerald-600 mt-1">Total revenue</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        
        <div className="group bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl p-6 shadow-lg border border-amber-200 hover:shadow-xl transition-all duration-300 h-full">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-amber-700 mb-1">Pending Balance</div>
              <div className="text-3xl font-bold text-amber-900">{formatNumber(totalPendingBalance)}</div>
              <div className="text-xs text-amber-600 mt-1">Outstanding amount</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <IndianRupee className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        
        <div className="group bg-gradient-to-br from-violet-50 to-purple-100 rounded-xl p-6 shadow-lg border border-violet-200 hover:shadow-xl transition-all duration-300 h-full">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-violet-700 mb-1">Completion Rate</div>
              <div className="text-3xl font-bold text-violet-900">{completionRate}%</div>
              <div className="text-xs text-violet-600 mt-1">Success rate</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Customers Card (like Dashboard) */}
      {(() => {
        const count = displayPending.length
        const totalAmount = displayPending.reduce((sum, p) => sum + (p.emi * p.count), 0)
        const containerTone = count >= 10 ? 'bg-red-50 border-red-200' : count >= 5 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
        const titleTone = count >= 10 ? 'text-red-900' : count >= 5 ? 'text-amber-900' : 'text-blue-900'
        const labelTone = count >= 10 ? 'text-red-700' : count >= 5 ? 'text-amber-700' : 'text-blue-700'
        
        return (
          <div className={`p-6 rounded-lg shadow-sm border ${containerTone}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${titleTone}`}>Pending Customers</p>
                <p className="text-2xl text-gray-900">{count}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm ${labelTone}`}>Amount Due This Week</p>
                <p className="text-xl text-gray-900">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <button onClick={refreshAll} className="inline-flex items-center gap-2 px-3 py-2 rounded border text-sm hover:bg-gray-50">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Show by Batch</span>
                <select value={pendingBatchFilter} onChange={e => setPendingBatchFilter(e.target.value as any)} className="px-2 py-1 border rounded">
                  <option value="">All</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                </select>
              </div>
            </div>

            {displayPending.length === 0 ? (
              <div className="mt-4 text-sm text-gray-600">No pending customers for this week.</div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-4">Customer</th>
                      <th className="py-2 pr-4">Batch</th>
                      <th className="py-2 pr-4">Worker</th>
                      <th className="py-2 pr-4">Pending Count</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayPending.map(p => (
                      <tr key={p.loan.id}>
                        <td className="py-2 pr-4">
                          <CustomerNameLink
                            customer={p.loan.customer}
                            loan={p.loan}
                            name={p.loan.customer?.name || p.loan.customer?.customer_id_display || 'Customer'}
                          />
                        </td>
                        <td className="py-2 pr-4 capitalize">{p.loan.weekly_batch || '-'}</td>
                        <td className="py-2 pr-4">{getWorkerName(p.loan.team_leader_id)}</td>
                        <td className="py-2 pr-4">{p.count}</td>
                        <td className="py-2 pr-4">{formatCurrency(p.emi * p.count)}</td>
                        <td className="py-2 pr-4">
                          <button
                            onClick={() => handleIndividualCollection(p.loan.id)}
                            disabled={collectingCustomerId === p.loan.id}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded transition-colors duration-200"
                          >
                            {collectingCustomerId === p.loan.id ? 'Collecting...' : 'Collect'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })()}
                      
      {/* Weekly Collection Batches (with real data) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Weekly Collection Batches</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Current Week Collections</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {(['tuesday','thursday','friday'] as WeeklyBatch[]).map(day => {
            const batchData = weeklyBatchData[day]
            const batchColors = {
              tuesday: 'from-blue-500 to-indigo-600',
              thursday: 'from-emerald-500 to-green-600', 
              friday: 'from-purple-500 to-pink-600'
            }
            const cardColors = {
              tuesday: 'from-blue-50 to-indigo-100 border-blue-200',
              thursday: 'from-emerald-50 to-green-100 border-emerald-200',
              friday: 'from-purple-50 to-pink-100 border-purple-200'
            }
            
            return (
              <div key={day} className={`group bg-gradient-to-br rounded-xl p-6 shadow-lg border hover:shadow-xl transition-all duration-300 h-full ${cardColors[day]}`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-4 bg-gradient-to-br rounded-xl shadow-lg ${batchColors[day]}`}>
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 capitalize">{day} Batch</h3>
                    <p className="text-sm text-gray-600">Weekly Collection</p>
                  </div>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/50">
                    <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                    <div className="text-3xl font-bold text-gray-900">{formatCurrency(batchData.totalAmount)}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
                      <div className="text-xs text-gray-600 mb-1">Pending</div>
                      <div className="text-xl font-bold text-amber-600">{batchData.customerCount}</div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
                      <div className="text-xs text-gray-600 mb-1">Total</div>
                      <div className="text-xl font-bold text-gray-900">{batchData.loans.length}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleCollectAmount(day)} 
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-colors duration-300"
                  >
                    Collect Amount
                  </button>
                  <button 
                    onClick={() => {
                      alert(`${day.charAt(0).toUpperCase() + day.slice(1)} Batch Details:

Total Amount: ${formatCurrency(batchData.totalAmount)}
Pending Customers: ${batchData.customerCount}
Total Customers: ${batchData.loans.length}

Click "Collect Amount" to process collections for this batch.`)
                    }} 
                    className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-colors duration-300"
                  >
                    View Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Worker Performance Summary */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Worker Performance Summary</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Total Workers: {employees.length}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {employees.map(emp => {
            const empLoans = loans.filter(l => l.team_leader_id === emp.id)
            // Calculate total amount using new EMI formula
            const totalAmount = empLoans.reduce((s, l) => {
              return s + calculateTotalPayable(l)
            }, 0)
            
            const collectedAmount = collections
              .filter(c => empLoans.some(loan => loan.id === c.loan_id))
              .reduce((s, c) => s + (Number(c.amount_collected) || 0), 0)
            const completionRate = totalAmount > 0 ? Math.round((collectedAmount / totalAmount) * 100) : 0
            
            return (
              <div key={emp.id} className="group bg-gradient-to-br from-white to-gray-50 rounded-xl p-4 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                    {emp.designation || 'LEADER'}
                  </span>
                </div>
                
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{emp.name}</h3>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2 border border-white/50">
                      <div className="text-sm text-gray-600 mb-1">Customers</div>
                      <div className="text-xl font-bold text-gray-900">{empLoans.length}</div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2 border border-white/50">
                      <div className="text-sm text-gray-600 mb-1">Completion</div>
                      <div className="text-xl font-bold text-green-600">{completionRate}%</div>
                    </div>
                  </div>
                  
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2 border border-white/50 mb-2">
                    <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                    <div className="text-base font-bold text-gray-900">{formatCurrency(totalAmount)}</div>
                  </div>
                  
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2 border border-white/50">
                    <div className="text-sm text-gray-600 mb-1">Collected</div>
                    <div className="text-base font-bold text-green-600">{formatCurrency(collectedAmount)}</div>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    alert(`Worker Details:

Name: ${emp.name}
Designation: ${emp.designation || 'LEADER'}
Customers: ${empLoans.length}
Total Amount: ${formatCurrency(totalAmount)}
Collected: ${formatCurrency(collectedAmount)}
Completion Rate: ${completionRate}%`)
                  }}
                  className="w-full px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-base font-semibold rounded-lg transition-colors duration-300"
                >
                  View Details
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-lg border border-gray-200 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Filter Collections</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Advanced Search</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Search</label>
            <div className="relative">
              <input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Search collection, customer, phone..." 
                className="w-full pl-10 pr-4 py-2.5 fintech-input"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Date</label>
            <input 
              type="date" 
              value={dateFilter} 
              onChange={e => setDateFilter(e.target.value)} 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Batch</label>
            <select 
              value={batchFilter} 
              onChange={e => setBatchFilter(e.target.value as any)} 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm"
            >
              <option value="all">All Batches</option>
              <option value="tuesday">Tuesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Worker</label>
            <select 
              value={workerFilter} 
              onChange={e => setWorkerFilter(e.target.value)} 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm"
            >
              <option value="">All Workers</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Status</label>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value as any)} 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Collections table (Desktop & Tablet) */}
      <div className="hidden md:block fintech-table-container">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Collections History</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">{filteredCollections.length} records</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/90 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Collection ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Loan Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Collected</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Remaining</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due No.</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Collection Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Worker (Leader)</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCollections.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <CreditCard className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="text-gray-500 font-medium">No collections found</div>
                      <div className="text-sm text-gray-400">Try adjusting your filters or search terms</div>
                    </div>
                  </td>
                </tr>
              )}
              {filteredCollections.map(c => {
                const displayId = collectionDisplayIdMap.get(c.id) || c.id
                const customer = c.customer || c.loan?.customer
                const dueInfo = collectionDueNoMap.get(c.id)
                const remainingVal = collectionRemainingMap.get(c.id) ?? (Number(c.remaining_balance) || 0)
                const progressPct = dueInfo ? Math.min(100, Math.round((dueInfo.installmentNumber / dueInfo.totalWeeks) * 100)) : 0
                const isProgressComplete = dueInfo ? dueInfo.installmentNumber >= dueInfo.totalWeeks : false

                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors duration-200">
                    {/* 1. COLLECTION ID */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-semibold text-slate-800">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {displayId}
                      </span>
                    </td>

                    {/* 2. CUSTOMER ID */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-medium text-slate-700">
                      {customer?.customer_id_display ? (
                        customer.customer_id_display
                      ) : (
                        <span className="text-gray-400 italic">Customer not found</span>
                      )}
                    </td>

                    {/* 3. CUSTOMER */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <CustomerNameLink
                        customer={customer}
                        loan={c.loan}
                        name={customer?.name || 'Customer not found'}
                        nameClassName="text-sm font-bold text-gray-900 hover:text-primary-600"
                      />
                      {customer?.phone && (
                        <div className="text-xs text-gray-500 font-normal">{customer.phone}</div>
                      )}
                    </td>

                    {/* 4. LOAN AMOUNT */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatCurrency(c.loan?.amount || 0)}
                    </td>

                    {/* 5. COLLECTED */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                      {formatCurrency(Number(c.amount_collected) || 0)}
                    </td>

                    {/* 6. REMAINING */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-600">
                      {formatCurrency(remainingVal)}
                    </td>

                    {/* 7. DUE NO. */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dueInfo ? (
                        <div
                          className="flex flex-col gap-1 min-w-[90px]"
                          title={`Due Date: ${dueInfo.dueDateStr ? formatDate(dueInfo.dueDateStr) : 'FIFO order'} · Installment ${dueInfo.installmentNumber} of ${dueInfo.totalWeeks}`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className={dueInfo.isPartial ? 'text-amber-700' : 'text-slate-800'}>
                              {dueInfo.installmentNumber}/{dueInfo.totalWeeks}
                              {dueInfo.isPartial && <span className="ml-1 text-[10px] text-amber-600 font-medium">(partial)</span>}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{progressPct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isProgressComplete ? 'bg-emerald-500' : dueInfo.isPartial ? 'bg-amber-500' : 'bg-primary-600'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {/* 8. COLLECTION DATE */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(c.collection_date)}
                    </td>

                    {/* 9. WORKER (LEADER) */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">
                          {c.worker?.name || c.loan?.team_leader?.name || 'Unassigned'}
                        </span>
                        {(c.worker?.leader_id || c.loan?.team_leader?.leader_id || c.worker?.id) && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {c.worker?.leader_id || c.loan?.team_leader?.leader_id || c.worker?.id}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 10. STATUS */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${
                          (c.status || '').toLowerCase() === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : (c.status || '').toLowerCase() === 'partial'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {c.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Collections Card View (< 768px) */}
      <div className="block md:hidden space-y-3">
        {filteredCollections.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-sm text-gray-500">
            No collections found matching current filters.
          </div>
        ) : (
          filteredCollections.map((c) => {
            const displayId = collectionDisplayIdMap.get(c.id) || c.id
            const customer = c.customer || c.loan?.customer
            const dueInfo = collectionDueNoMap.get(c.id)
            const remainingVal = collectionRemainingMap.get(c.id) ?? (Number(c.remaining_balance) || 0)
            const progressPct = dueInfo ? Math.min(100, Math.round((dueInfo.installmentNumber / dueInfo.totalWeeks) * 100)) : 0
            const isProgressComplete = dueInfo ? dueInfo.installmentNumber >= dueInfo.totalWeeks : false

            return (
              <div key={c.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {displayId}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold capitalize border ${
                      (c.status || '').toLowerCase() === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : (c.status || '').toLowerCase() === 'partial'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {c.status || 'pending'}
                  </span>
                </div>

                <div>
                  <CustomerNameLink
                    customer={customer}
                    loan={c.loan}
                    name={customer?.name || 'Customer not found'}
                    nameClassName="text-sm font-bold text-gray-900"
                  />
                  <div className="text-xs text-gray-500 font-mono mt-0.5">
                    ID: {customer?.customer_id_display || '—'} {customer?.phone && `· ${customer.phone}`}
                  </div>
                </div>

                {dueInfo && (
                  <div className="bg-slate-50 p-2.5 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-600">Due No: <span className={dueInfo.isPartial ? 'text-amber-700' : 'text-slate-900'}>{dueInfo.installmentNumber}/{dueInfo.totalWeeks}{dueInfo.isPartial && ' (partial)'}</span></span>
                      <span className="text-[10px] text-gray-400 font-mono">{progressPct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isProgressComplete ? 'bg-emerald-500' : dueInfo.isPartial ? 'bg-amber-500' : 'bg-primary-600'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <div className="text-[10px] text-gray-500">Loan Amt</div>
                    <div className="text-xs font-bold text-gray-900">{formatCurrency(c.loan?.amount || 0)}</div>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <div className="text-[10px] text-emerald-700">Collected</div>
                    <div className="text-xs font-bold text-emerald-800">{formatCurrency(Number(c.amount_collected) || 0)}</div>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg">
                    <div className="text-[10px] text-amber-700">Remaining</div>
                    <div className="text-xs font-bold text-amber-800">{formatCurrency(remainingVal)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-slate-100">
                  <span>{formatDate(c.collection_date)}</span>
                  <span className="font-medium text-slate-700">Worker: {c.worker?.name || c.loan?.team_leader?.name || 'Unassigned'}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Batch Collection Modal */}
      {showBatchCollectionModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h2 className="text-lg md:text-xl font-semibold">
                Collect Amount - {selectedBatch!.charAt(0).toUpperCase() + selectedBatch!.slice(1)} Batch
              </h2>
              <button 
                onClick={() => {
                  setShowBatchCollectionModal(false)
                  setSelectedBatch(null)
                  setSelectedCustomers({})
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {getBatchCustomers(selectedBatch!).every(loan => selectedCustomers[loan.id]) ? 'Unselect All' : 'Select All'}
                </button>
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-blue-600">
                    {Object.keys(selectedCustomers).filter(id => selectedCustomers[id]).length}
                  </span> of {getBatchCustomers(selectedBatch!).length} selected
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total Selected Amount:</div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(
                    getBatchCustomers(selectedBatch!)
                      .filter(loan => selectedCustomers[loan.id])
                      .reduce((sum, loan) => sum + calculateWeeklyEMI(loan), 0)
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-4 py-3">Select</th>
                    <th className="px-4 py-3">Customer ID</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Worker</th>
                    <th className="px-4 py-3">Weekly EMI</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {getBatchCustomers(selectedBatch!).map(loan => {
                    const weeklyEmi = calculateWeeklyEMI(loan)
                    const isSelected = selectedCustomers[loan.id] || false
                    return (
                      <tr key={loan.id} className={isSelected ? 'bg-green-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCustomerSelection(loan.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{loan.customer?.customer_id_display || getLoanDisplayId(loan)}</td>
                        <td className="px-4 py-3 font-medium">
                          <CustomerNameLink
                            customer={loan.customer}
                            loan={loan}
                            name={loan.customer?.name || 'N/A'}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded ${
                            loan.customer?.phone ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {loan.customer?.phone || 'No Phone'}
                          </span>
                        </td>
                        <td className="px-4 py-3">{getWorkerName(loan.team_leader_id)}</td>
                        <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(weeklyEmi)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded font-semibold ${
                            isSelected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {isSelected ? 'Will Collect' : 'Will be Pending'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Section */}
            {Object.keys(selectedCustomers).filter(id => selectedCustomers[id]).length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">Collection Summary</h3>
                    <p className="text-sm text-blue-700">
                      {Object.keys(selectedCustomers).filter(id => selectedCustomers[id]).length} customers selected for collection
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(
                        getBatchCustomers(selectedBatch!)
                          .filter(loan => selectedCustomers[loan.id])
                          .reduce((sum, loan) => sum + calculateWeeklyEMI(loan), 0)
                      )}
                    </p>
                    <p className="text-sm text-blue-700">Total Collection Amount</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {getBatchCustomers(selectedBatch!).length} customers in {selectedBatch!.charAt(0).toUpperCase() + selectedBatch!.slice(1)} Batch
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowBatchCollectionModal(false)
                    setSelectedBatch(null)
                    setSelectedCustomers({})
                  }}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  disabled={isCollecting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchCollection}
                  disabled={isCollecting || Object.keys(selectedCustomers).filter(id => selectedCustomers[id]).length === 0}
                  className={`px-6 py-2 rounded text-sm font-semibold ${
                    isCollecting || Object.keys(selectedCustomers).filter(id => selectedCustomers[id]).length === 0
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isCollecting ? 'Processing...' : `Collect Amount (${Object.keys(selectedCustomers).filter(id => selectedCustomers[id]).length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


