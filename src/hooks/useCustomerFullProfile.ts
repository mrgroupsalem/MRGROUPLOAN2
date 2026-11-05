'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Customer, Loan, Collection, Employee } from '@/types'
import { supabase } from '@/lib/supabase'

export interface CustomerFullProfileData {
  customer: Customer | null
  loans: Loan[]
  activeLoan: Loan | null
  collections: Collection[]
  employees: Employee[]
}

interface CacheEntry {
  data: CustomerFullProfileData
  timestamp: number
}

// In-memory cache across drawer open/closes (TTL: 2 minutes)
const profileCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 2 * 60 * 1000

// Helper to check if string is a valid UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function invalidateCustomerProfileCache(customerId?: string) {
  if (customerId) {
    profileCache.delete(customerId)
  } else {
    profileCache.clear()
  }
}

export function useCustomerFullProfile(
  customerIdOrIdentifier: string | null | undefined,
  initialLoanId?: string | null
) {
  const [data, setData] = useState<CustomerFullProfileData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isError, setIsError] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  // Track currently active request to avoid race conditions
  const activeReqRef = useRef<string | null>(null)

  const fetchProfile = useCallback(
    async (force: boolean = false) => {
      if (!customerIdOrIdentifier) {
        setData(null)
        setIsLoading(false)
        setIsError(false)
        setError(null)
        return
      }

      const identifier = String(customerIdOrIdentifier).trim()
      if (!identifier) return

      activeReqRef.current = identifier

      // Check cache first if not forced
      const cached = profileCache.get(identifier)
      const isFresh = cached && Date.now() - cached.timestamp < CACHE_TTL_MS

      if (cached && !force) {
        // If initialLoanId specified, ensure activeLoan matches
        let resolvedActiveLoan = cached.data.activeLoan
        if (initialLoanId) {
          const match = cached.data.loans.find((l) => l.id === initialLoanId)
          if (match) resolvedActiveLoan = match
        }
        setData({ ...cached.data, activeLoan: resolvedActiveLoan })
        if (isFresh) {
          setIsLoading(false)
          return
        }
      }

      if (!cached) {
        setIsLoading(true)
      }
      setIsError(false)
      setError(null)

      try {
        // 1. Resolve Customer safely
        let resolvedCustomer: Customer | null = null
        const isUuid = UUID_REGEX.test(identifier)

        if (isUuid) {
          const { data: custData, error: custErr } = await supabase
            .from('customers')
            .select('*')
            .eq('id', identifier)
            .maybeSingle()

          if (custErr) throw custErr
          if (custData) resolvedCustomer = custData as Customer
        }

        // If not found by UUID, try display ID or phone
        if (!resolvedCustomer) {
          const { data: custData, error: custErr } = await supabase
            .from('customers')
            .select('*')
            .or(`customer_id_display.eq.${identifier},phone.eq.${identifier}`)
            .maybeSingle()

          if (custErr) console.warn('[useCustomerFullProfile] lookup by display/phone warn:', custErr.message)
          if (custData) resolvedCustomer = custData as Customer
        }

        // If still not found, check if identifier is a loan ID (UUID or display)
        if (!resolvedCustomer) {
          let loanQuery = supabase.from('loans').select('*, customer:customers(*)')
          if (isUuid) {
            loanQuery = loanQuery.eq('id', identifier)
          } else {
            loanQuery = loanQuery.eq('loan_id_display', identifier)
          }
          const { data: loanMatch } = await loanQuery.maybeSingle()
          if (loanMatch && loanMatch.customer) {
            resolvedCustomer = loanMatch.customer as Customer
          }
        }

        if (!resolvedCustomer) {
          throw new Error(`Customer "${identifier}" not found in database.`)
        }

        const customerUuid = resolvedCustomer.id

        // 2. Fetch all loans for this customer (with relations)
        const { data: loansData, error: loansErr } = await supabase
          .from('loans')
          .select('*, customer:customers(*), team_leader:employees(*)')
          .eq('customer_id', customerUuid)
          .order('created_at', { ascending: false })

        if (loansErr) throw loansErr
        const allLoans = (loansData || []) as Loan[]

        // Determine active loan
        let selectedLoan: Loan | null = null
        if (initialLoanId) {
          selectedLoan = allLoans.find((l) => l.id === initialLoanId) || null
        }
        if (!selectedLoan && allLoans.length > 0) {
          selectedLoan = allLoans.find((l) => l.status === 'active') || allLoans[0]
        }

        // 3. Fetch all collections for this customer & loans
        const loanIds = allLoans.map((l) => l.id)
        let collections: Collection[] = []

        if (loanIds.length > 0) {
          const { data: collsData, error: collsErr } = await supabase
            .from('collections')
            .select('*')
            .or(`customer_id.eq.${customerUuid},loan_id.in.(${loanIds.join(',')})`)
            .order('collection_date', { ascending: false })

          if (collsErr) throw collsErr
          collections = (collsData || []) as Collection[]
        } else {
          const { data: collsData, error: collsErr } = await supabase
            .from('collections')
            .select('*')
            .eq('customer_id', customerUuid)
            .order('collection_date', { ascending: false })

          if (collsErr) throw collsErr
          collections = (collsData || []) as Collection[]
        }

        // 4. Fetch employees (for team leader names/phone)
        const { data: empData } = await supabase.from('employees').select('*')
        const employees = (empData || []) as Employee[]

        const fullProfileData: CustomerFullProfileData = {
          customer: resolvedCustomer,
          loans: allLoans,
          activeLoan: selectedLoan,
          collections,
          employees,
        }

        // Check race condition
        if (activeReqRef.current === identifier) {
          // Cache by both identifier and actual customer UUID and display ID
          profileCache.set(identifier, { data: fullProfileData, timestamp: Date.now() })
          if (resolvedCustomer.id) {
            profileCache.set(resolvedCustomer.id, { data: fullProfileData, timestamp: Date.now() })
          }
          if (resolvedCustomer.customer_id_display) {
            profileCache.set(resolvedCustomer.customer_id_display, { data: fullProfileData, timestamp: Date.now() })
          }

          setData(fullProfileData)
          setIsLoading(false)
        }
      } catch (err: any) {
        if (activeReqRef.current === identifier) {
          console.error('[useCustomerFullProfile] Error:', err)
          setIsError(true)
          setError(err instanceof Error ? err : new Error(String(err)))
          setIsLoading(false)
        }
      }
    },
    [customerIdOrIdentifier, initialLoanId]
  )

  useEffect(() => {
    fetchProfile(false)
  }, [fetchProfile])

  const refetch = useCallback(() => {
    return fetchProfile(true)
  }, [fetchProfile])

  return {
    customer: data?.customer || null,
    loans: data?.loans || [],
    activeLoan: data?.activeLoan || null,
    collections: data?.collections || [],
    employees: data?.employees || [],
    isLoading,
    isError,
    error,
    refetch,
  }
}

