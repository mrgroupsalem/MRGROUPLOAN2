'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

export default function ClosedLoans({ onBack }: { onBack: () => void }) {
  const [loans, setLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'end_date' | 'loan_amount' | 'customer_name'>('end_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const loadClosedLoans = async () => {
    setLoading(true)
    try {
      // Fetch closed_loans, customers, and employees separately (no FK relationships needed)
      const [closedRes, customersRes, employeesRes] = await Promise.all([
        supabase
          .from('closed_loans')
          .select('*'),
        supabase.from('customers').select('*'),
        supabase.from('employees').select('*')
      ])

      // Normalize related tables once, for use in both primary and fallback paths
      const customers = customersRes.error ? [] : (customersRes.data || [])
      const employees = employeesRes.error ? [] : (employeesRes.data || [])

      if (closedRes.error || (Array.isArray(closedRes.data) && closedRes.data.length === 0)) {
        console.error('Error loading closed_loans (will try fallback to loans.status=closed):', closedRes.error)
        // Fallback: read from regular loans table where status = 'closed'
        const { data: fallbackLoans, error: fallbackErr } = await supabase
          .from('loans')
          .select('*')
          .eq('status', 'closed')
        if (fallbackErr) {
          console.error('Fallback read from loans failed:', fallbackErr)
          setLoans([])
          setLoading(false)
          return
        }

        const mappedFromLoans = (fallbackLoans || []).map((l: any) => {
          const customer = customers.find((c: any) => (c.customer_id_display === l.customer_id) || (c.phone === l.customer_id)) || null
          const teamLeader = employees.find((e: any) => e.id === l.team_leader_id) || null
          return {
            id: l.id,
            loan_id: l.id,
            customer_id: customer?.id || null,
            customer_id_display: l.customer_id,
            customer_name: customer?.name || '',
            loan_amount: Number(l.amount) || 0,
            interest_rate: Number(l.interest_rate || 0),
            total_amount_paid: 0,
            balance_at_closure: Number(l.amount) || 0,
            number_of_weeks: l.number_of_weeks || null,
            start_date: l.start_date,
            end_date: l.end_date,
            closure_date: l.end_date || l.updated_at || l.created_at,
            team_leader_id: teamLeader?.id || l.team_leader_id || null,
            team_leader_name: teamLeader?.name || '',
            loan_purpose: l.loan_purpose || null,
            weekly_batch: l.weekly_batch || null,
            notes: l.notes || '',
            // normalized fields for UI
            amount: Number(l.amount) || 0,
            customer: customer || { name: '', id: customer?.id, customer_id_display: l.customer_id },
            team_leader: teamLeader || { id: l.team_leader_id, name: teamLeader?.name || '' }
          }
        })

        const sortedFallback = [...mappedFromLoans].sort((a: any, b: any) => {
          const ad = new Date(a.end_date || a.closure_date || 0).getTime()
          const bd = new Date(b.end_date || b.closure_date || 0).getTime()
          return sortOrder === 'asc' ? ad - bd : bd - ad
        })
        setLoans(sortedFallback)
        return
      }

      const mappedLoans = (closedRes.data || []).map((loan: any) => {
        const customer = customers.find((c: any) => c.id === loan.customer_id) || null
        const teamLeader = employees.find((e: any) => e.id === loan.team_leader_id) || null

        return {
          ...loan,
          amount: loan.loan_amount,
          customer: customer || { name: loan.customer_name, id: loan.customer_id, customer_id_display: loan.customer_id_display },
          team_leader: teamLeader || { id: loan.team_leader_id, name: loan.team_leader_name },
          customer_id: loan.customer_id_display || loan.customer_id
        }
      })

      // Client-side sorting to avoid DB errors on absent columns
      const sorted = [...mappedLoans].sort((a: any, b: any) => {
        if (sortBy === 'loan_amount') {
          const diff = Number(a.loan_amount || 0) - Number(b.loan_amount || 0)
          return sortOrder === 'asc' ? diff : -diff
        }
        if (sortBy === 'customer_name') {
          const an = (a.customer?.name || a.customer_name || '').toLowerCase()
          const bn = (b.customer?.name || b.customer_name || '').toLowerCase()
          const cmp = an.localeCompare(bn)
          return sortOrder === 'asc' ? cmp : -cmp
        }
        // Default: end_date (fallback to closure_date or created_at)
        const ad = new Date(a.end_date || a.closure_date || a.created_at || 0).getTime()
        const bd = new Date(b.end_date || b.closure_date || b.created_at || 0).getTime()
        const diff = ad - bd
        return sortOrder === 'asc' ? diff : -diff
      })

      setLoans(sorted)
    } catch (err) {
      console.error('Unexpected error loading closed loans:', err)
      alert('Unexpected error loading closed loans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClosedLoans()
  }, [sortBy, sortOrder])

  // Update sortBy handler to work with closed_loans field names
  const handleSortByChange = (newSortBy: string) => {
    // Map UI sort options to database field names
    if (newSortBy === 'amount') {
      setSortBy('loan_amount')
    } else if (newSortBy === 'customer_name') {
      setSortBy('customer_name')
    } else {
      setSortBy('end_date')
    }
  }

  // Filter loans based on search term
  const filteredLoans = loans.filter(loan => {
    const customerName = (loan.customer?.name || loan.customer_id || '').toLowerCase()
    const searchLower = searchTerm.toLowerCase()
    return customerName.includes(searchLower)
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">Closed Loans</h1>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {filteredLoans.length} loans
          </span>
        </div>
        <button 
          onClick={loadClosedLoans}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Search and Sort Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => handleSortByChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="end_date">Sort by End Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="customer_name">Sort by Customer</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Closed Loans Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading closed loans...</div>
        ) : filteredLoans.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            {searchTerm ? 'No closed loans found matching your search.' : 'No closed loans found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Leader</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLoans.map(loan => (
                  <tr key={loan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {loan.customer?.name || loan.customer_id}
                      </div>
                      <div className="text-sm text-gray-500">ID: {loan.customer_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(loan.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {loan.interest_rate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {loan.team_leader?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(loan.start_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(loan.end_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Closed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


