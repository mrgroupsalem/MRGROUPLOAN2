'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Customer, Loan, Collection, Employee } from '@/types'
import { supabase } from '@/lib/supabase'
import CustomerProfileDrawer from '@/components/dashboard/CustomerProfileDrawer'
import EditLoanForm from '@/components/EditLoanForm'
import QuickCollectModal from '@/components/dashboard/QuickCollectModal'
import { PendingCustomerItem, calculateEMI, calculateTotalPayable } from '@/hooks/usePendingCollections'
import { invalidateCustomerProfileCache } from '@/hooks/useCustomerFullProfile'
import { getPendingDueBreakdown } from '@/lib/pendingBreakdown'

interface CustomerProfileContextValue {
  open: (customerId: string, loanId?: string | null) => void
  openCustomerProfile: (customerOrId: string | Partial<Customer>, loan?: Loan | null) => void
  closeCustomerProfile: () => void
}

const CustomerProfileContext = createContext<CustomerProfileContextValue | undefined>(undefined)

export function CustomerProfileProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null)
  const [activeLoanId, setActiveLoanId] = useState<string | null>(null)

  // Sub-modals inside Drawer
  const [collectItem, setCollectItem] = useState<PendingCustomerItem | null>(null)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])

  // Load employees for EditLoanForm
  useEffect(() => {
    async function loadEmployees() {
      const { data } = await supabase.from('employees').select('*')
      if (data) setEmployees(data as Employee[])
    }
    loadEmployees()
  }, [])

  const openCustomerProfile = useCallback(
    (customerOrId: string | Partial<Customer>, loan?: Loan | null) => {
      let resolvedId = ''

      if (typeof customerOrId === 'string') {
        resolvedId = customerOrId.trim()
      } else if (customerOrId && typeof customerOrId === 'object') {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            '[CustomerProfileContext] Dev Warning: Expected customerId string, received object:',
            customerOrId
          )
        }
        resolvedId = customerOrId.id || (customerOrId as any).customer_id || (customerOrId as any).customer_id_display || ''
      }

      if (!resolvedId && loan?.customer_id) {
        resolvedId = loan.customer_id
      }

      setActiveCustomerId(resolvedId)
      setActiveLoanId(loan?.id || null)
      setIsOpen(true)
    },
    []
  )

  // Direct alias: useCustomerProfile().open(customerId, loanId?)
  const open = useCallback(
    (customerId: string, loanId?: string | null) => {
      openCustomerProfile(customerId, loanId ? ({ id: loanId } as any) : null)
    },
    [openCustomerProfile]
  )

  const closeCustomerProfile = useCallback(() => {
    setIsOpen(false)
    setActiveCustomerId(null)
    setActiveLoanId(null)
  }, [])

  // Collect Payment handler from Drawer
  const handleCollectPayment = useCallback(
    async (loan: Loan) => {
      const emi = calculateEMI(loan)
      const totalPayable = calculateTotalPayable(loan)

      // Fetch collections for this loan to compute remaining balance & breakdown
      const { data: collsData } = await supabase
        .from('collections')
        .select('*')
        .eq('loan_id', loan.id)

      const colls = (collsData || []) as Collection[]
      const totalCollected = colls.reduce((sum, c) => sum + (Number(c.amount_collected) || 0), 0)
      const remaining = Math.max(0, totalPayable - totalCollected)
      const breakdown = getPendingDueBreakdown(loan, colls)

      const pItem: PendingCustomerItem = {
        loanId: loan.id,
        loan,
        customerName: loan.customer?.name || 'Customer',
        customerPhone: loan.customer?.phone || '',
        customerIdDisplay: loan.customer?.customer_id_display || loan.loan_id_display || loan.customer_id.slice(0, 8),
        teamLeaderId: loan.team_leader_id || '',
        teamLeaderName: loan.team_leader?.name || 'Unassigned',
        batchDay: (loan.weekly_batch as any) || 'tuesday',
        weeklyEmi: emi,
        currentCycleEmi: emi,
        previousPendingAmount: 0,
        totalPendingAmount: emi,
        missedWeeksCount: 1,
        daysOverdue: 0,
        status: 'pending',
        remainingBalance: remaining,
        totalLoanAmount: totalPayable,
        totalCollectedSoFar: totalCollected,
        breakdown,
      }

      setCollectItem(pItem)
    },
    []
  )

  const handleCollectionSuccess = useCallback(
    (collectedAmt: number) => {
      // Invalidate cache so drawer shows updated paid & pending immediately
      if (activeCustomerId) {
        invalidateCustomerProfileCache(activeCustomerId)
      }
      setCollectItem(null)
    },
    [activeCustomerId]
  )

  return (
    <CustomerProfileContext.Provider value={{ open, openCustomerProfile, closeCustomerProfile }}>
      {children}

      {/* Unified Global Profile Drawer */}
      <CustomerProfileDrawer
        customerId={activeCustomerId}
        initialLoanId={activeLoanId}
        isOpen={isOpen}
        onClose={closeCustomerProfile}
        onCollect={handleCollectPayment}
        onEdit={(loan) => setEditingLoan(loan)}
      />

      {/* Collect Payment Modal (triggered from Drawer) */}
      {collectItem && (
        <QuickCollectModal
          customer={collectItem}
          isOpen={!!collectItem}
          onClose={() => setCollectItem(null)}
          onSuccess={handleCollectionSuccess}
        />
      )}

      {/* Edit Loan & Customer Modal (triggered from Drawer) */}
      {editingLoan && (
        <EditLoanForm
          loan={editingLoan}
          employees={employees}
          isOpen={!!editingLoan}
          onClose={() => {
            setEditingLoan(null)
            if (activeCustomerId) {
              invalidateCustomerProfileCache(activeCustomerId)
            }
          }}
          onSaveSuccess={() => {
            setEditingLoan(null)
            if (activeCustomerId) {
              invalidateCustomerProfileCache(activeCustomerId)
            }
          }}
        />
      )}
    </CustomerProfileContext.Provider>
  )
}

export function useCustomerProfile() {
  const ctx = useContext(CustomerProfileContext)
  if (!ctx) {
    throw new Error('useCustomerProfile must be used within CustomerProfileProvider')
  }
  return ctx
}
