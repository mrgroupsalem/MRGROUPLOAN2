'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Eye, Phone, MapPin, Download, X } from 'lucide-react'
import { Customer, Loan } from '@/types'
import { formatDate } from '@/lib/utils'
import { exportCustomers } from '@/lib/exportUtils'
import { supabase } from '@/lib/supabase'
import CustomerLoanHistory from './CustomerLoanHistory'
import DisbursementInfo from '@/components/ui/DisbursementInfo'

interface CustomerManagementProps {
  onBack: () => void
}

export default function CustomerManagement({ onBack }: CustomerManagementProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [loanStatusFilter, setLoanStatusFilter] = useState<'all' | 'active' | 'closed' | 'pending'>('all')
  const [loanTypeFilter, setLoanTypeFilter] = useState<'all' | 'emergency' | 'regular'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [historyTargetCustomer, setHistoryTargetCustomer] = useState<Customer | null>(null)

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load customers
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
        
        if (customersError) {
          console.error('Error loading customers:', customersError)
        } else {
          setCustomers(customersData || [])
        }

        // Load regular loans and emergency loans in parallel
        const [loansRes, emergencyLoansRes] = await Promise.all([
          supabase.from('loans').select('*'),
          supabase.from('emergency_loans').select('*')
        ])

        if (loansRes.error) {
          console.error('Error loading loans:', loansRes.error)
        }

        if (emergencyLoansRes.error) {
          console.error('Error loading emergency loans:', emergencyLoansRes.error)
        }

        const regularLoans: Loan[] = (loansRes.data || []) as Loan[]

        // Map emergency loans into Loan-like objects so UI can treat them uniformly
        const emergencyAsLoans: Loan[] = (emergencyLoansRes.data || []).map((el: any) => ({
          id: el.id,
          customer_id: el.customer_id_display || el.customer_id, // match by display id/phone like regular loans
          amount: Number(el.loan_amount) || 0,
          status: el.status || 'active',
          start_date: el.start_date,
          end_date: el.end_date,
          created_at: el.created_at || new Date().toISOString(),
          interest_rate: '0',
          number_of_weeks: el.number_of_days || 0,
          team_leader_id: el.team_leader_id || null,
          weekly_batch: undefined,
          loan_purpose: 'emergency',
          customer_bank_name: undefined,
          account_number: undefined,
          ifsc_code: undefined
        })) as Loan[]

        // Merge both lists; emergency loans will be highlighted in UI
        setLoans([...(regularLoans || []), ...emergencyAsLoans])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCustomerLoans = (customer: Customer) => {
    // Match loans by customer_id_display, phone number, or customer primary ID
    let matched = loans.filter(loan =>
      loan.customer_id === customer.id || 
      loan.customer_id === customer.customer_id_display || 
      loan.customer_id === customer.phone
    )
    // Filter by status if selected
    if (loanStatusFilter !== 'all') {
      matched = matched.filter(l => (l.status || '').toLowerCase() === loanStatusFilter)
    }
    // Filter by loan type (emergency vs regular)
    if (loanTypeFilter === 'emergency') {
      matched = matched.filter(l => l.loan_purpose === 'emergency')
    } else if (loanTypeFilter === 'regular') {
      matched = matched.filter(l => l.loan_purpose !== 'emergency')
    }
    return matched
  }

  // Check if a customer has any emergency loan (used to highlight table row)
  const hasEmergencyLoan = (customer: Customer) => {
    return loans.some(l => (
      (l.customer_id === customer.id || l.customer_id === customer.customer_id_display || l.customer_id === customer.phone) &&
      l.loan_purpose === 'emergency'
    ))
  }

  const getTotalLoanAmount = (customer: Customer) => {
    return getCustomerLoans(customer).reduce((sum, loan) => sum + loan.amount, 0)
  }

  const getActiveLoansCount = (customer: Customer) => {
    return getCustomerLoans(customer).filter(loan => loan.status === 'active').length
  }

  const handleEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer)
    setShowEditModal(true)
  }

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer)
    setShowDeleteModal(true)
  }

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return
    try {
      const res = await fetch(`/api/customers/${customerToDelete.id}/delete`, { method: 'DELETE' })
      const json = await res.json()
      
      if (!res.ok) {
        // Handle case where response is not OK but may not have json.success
        const errorMessage = json?.error || `HTTP error! status: ${res.status}`
        throw new Error(errorMessage)
      }
      
      if (!json.success) {
        throw new Error(json.error || 'Failed to delete customer')
      }
      
      setCustomers(customers.filter(c => c.id !== customerToDelete.id))
      setShowDeleteModal(false)
      setCustomerToDelete(null)
      alert('Customer deleted successfully')
    } catch (e: any) {
      console.error('Error deleting customer:', e)
      alert(`Error deleting customer: ${e.message || 'Please try again.'}`)
    }
  }

  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
    try {
      // Update customer in Supabase
      const { data, error } = await supabase
        .from('customers')
        .update({
          name: updatedCustomer.name,
          phone: updatedCustomer.phone,
          address: updatedCustomer.address,
          aadhaar_number: updatedCustomer.aadhaar_number,
          pan_number: updatedCustomer.pan_number,
          additional_mobile_1: updatedCustomer.additional_mobile_1,
          additional_mobile_1_relationship: updatedCustomer.additional_mobile_1_relationship,
          additional_mobile_2: updatedCustomer.additional_mobile_2,
          additional_mobile_2_relationship: updatedCustomer.additional_mobile_2_relationship
        })
        .eq('id', updatedCustomer.id)
        .select()

      if (error) {
        console.error('Error updating customer:', error)
        alert('Error updating customer. Please try again.')
        return
      }

      // Update local state
      setCustomers(customers.map(c => 
        c.id === updatedCustomer.id ? data[0] : c
      ))
      
      setShowEditModal(false)
      setCustomerToEdit(null)
      alert('Customer updated successfully!')
    } catch (error) {
      console.error('Error updating customer:', error)
      alert('Error updating customer. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 max-w-[100vw] overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors text-sm font-semibold"
            title="Back to Dashboard"
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Customer Directory</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                {customers.length} Borrowers
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Search, review and inspect borrower credit history and verified profiles</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* 1. Export CSV */}
          <button
            onClick={() => exportCustomers(customers)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold shadow-sm transition-all hover:border-slate-400"
            title="Export all customers to CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* 2. Add New Customer (Primary Action) */}
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-primary-500/25 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-full fintech-input"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Status</label>
          <select
            value={loanStatusFilter}
            onChange={(e) => setLoanStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Type</label>
          <select
            value={loanTypeFilter}
            onChange={(e) => setLoanTypeFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All</option>
            <option value="regular">Regular</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="fintech-table-container">
        <div className="overflow-x-auto">
          <table className="fintech-table">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Loans
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Loans
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => {
                  const isEmergency = hasEmergencyLoan(customer)
                  return (
                  <tr key={customer.id} className={`${isEmergency ? 'bg-red-50/60 ring-1 ring-red-200' : ''} hover:bg-gray-50`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.customer_id_display || customer.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* Customer Photo Thumbnail */}
                        {customer.photo_url && (
                          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                            <img
                              src={customer.photo_url}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        {isEmergency && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                            Emergency
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {customer.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start text-sm text-gray-900 max-w-xs">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-400" />
                        <span className="truncate">{customer.address}</span>
              </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {getCustomerLoans(customer).length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {getActiveLoansCount(customer)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{getTotalLoanAmount(customer).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(customer.created_at || customer.id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedCustomer(customer)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit Customer"
                        >
                  <Edit className="w-4 h-4" />
                </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Customer"
                        >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
                    </td>
                  </tr>
                )})
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Phone className="w-6 h-6 text-gray-400" />
            </div>
                      <p className="text-lg font-medium text-gray-900 mb-2">No customers found</p>
                      <p className="text-gray-500 mb-4">
                        {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first customer'}
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="btn-primary flex items-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add First Customer</span>
                        </button>
                      )}
              </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
              </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSave={(customer) => {
            setCustomers([...customers, customer])
            setShowAddModal(false)
          }}
        />
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          loans={getCustomerLoans(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          onOpenFullHistory={(c) => {
            setSelectedCustomer(null)
            setHistoryTargetCustomer(c)
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {showEditModal && customerToEdit && (
        <EditCustomerModal
          customer={customerToEdit}
          onClose={() => {
            setShowEditModal(false)
            setCustomerToEdit(null)
          }}
          onSave={handleUpdateCustomer}
        />
      )}


      {/* Full Customer Loan History Modal */}
      {historyTargetCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[80] p-4">
          <div className="max-w-4xl w-full">
            <CustomerLoanHistory
              customerId={historyTargetCustomer.id}
              customer={historyTargetCustomer}
              onClose={() => setHistoryTargetCustomer(null)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && customerToDelete && (
        <DeleteConfirmationModal
          itemName="customer"
          itemDetails={`${customerToDelete.name} (${customerToDelete.phone})`}
          onClose={() => {
            setShowDeleteModal(false)
            setCustomerToDelete(null)
          }}
          onConfirm={confirmDeleteCustomer}
        />
      )}
    </div>
  )
}

// Add Customer Modal Component
function AddCustomerModal({ 
  onClose, 
  onSave 
}: { 
  onClose: () => void
  onSave: (customer: Customer) => void
}) {
  const [formData, setFormData] = useState({
    customer_id_display: '',
    name: '',
    phone: '',
    address: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newCustomer: Customer = {
      id: Date.now().toString(),
      customer_id_display: formData.customer_id_display,
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      created_at: new Date().toISOString()
    }
    onSave(newCustomer)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Add New Customer</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer ID
            </label>
            <input
              type="text"
              value={formData.customer_id_display}
              onChange={(e) => setFormData({ ...formData, customer_id_display: e.target.value })}
              className="input-field"
              placeholder="e.g., CUST001, CUST002"
            />
            <p className="text-xs text-gray-500 mt-1">Optional: Custom ID to display instead of system ID</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
              rows={3}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Save Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Customer Details Modal Component
function CustomerDetailsModal({ 
  customer, 
  loans, 
  onClose,
  onOpenFullHistory
}: { 
  customer: Customer
  loans: Loan[]
  onClose: () => void
  onOpenFullHistory?: (customer: Customer) => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <h2 className="text-xl font-semibold">Customer Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            
            {/* Customer Photo */}
            {customer.photo_url && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Photo</label>
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                  <img
                    src={customer.photo_url}
                    alt={`${customer.name}'s photo`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-sm text-gray-900">{customer.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="text-sm text-gray-900">{customer.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <p className="text-sm text-gray-900">{customer.address}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Since</label>
                <p className="text-sm text-gray-900">{formatDate(customer.created_at || customer.id)}</p>
              </div>
            </div>
          </div>

          {/* Loan History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Loan History</h3>
              <button
                type="button"
                onClick={() => onOpenFullHistory && onOpenFullHistory(customer)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition-colors"
              >
                View Complete History & Repayments →
              </button>
            </div>
            {loans.length > 0 ? (
              <div className="space-y-3">
                {loans.map((loan) => (
                  <div
                    key={loan.id}
                    className={`rounded-lg p-4 ${
                      loan.loan_purpose === 'emergency'
                        ? 'bg-red-50 border border-red-500 ring-1 ring-red-300'
                        : 'border border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-medium ${loan.loan_purpose === 'emergency' ? 'text-red-800' : 'text-gray-900'}`}>
                          ₹{loan.amount.toLocaleString()}
                        </p>
                        <p className={`text-sm ${loan.loan_purpose === 'emergency' ? 'text-red-700' : 'text-gray-500'}`}>
                          {formatDate(loan.start_date)} - {formatDate(loan.end_date)}
                        </p>
                        {loan.loan_purpose === 'emergency' && (
                          <span className="mt-1 inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Emergency Loan
                          </span>
                        )}
                        <div className="mt-2">
                          <DisbursementInfo loan={loan} variant="compact" />
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        loan.status === 'active' ? 'bg-green-100 text-green-800' :
                        loan.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No loans found for this customer.</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Edit Customer Modal Component
function EditCustomerModal({ 
  customer, 
  onClose, 
  onSave 
}: { 
  customer: Customer
  onClose: () => void
  onSave: (customer: Customer) => void
}) {
  const [formData, setFormData] = useState({
    customer_id_display: customer.customer_id_display || '',
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    aadhaar_number: customer.aadhaar_number || '',
    pan_number: customer.pan_number || '',
    additional_mobile_1: customer.additional_mobile_1 || '',
    additional_mobile_1_relationship: customer.additional_mobile_1_relationship || '',
    additional_mobile_2: customer.additional_mobile_2 || '',
    additional_mobile_2_relationship: customer.additional_mobile_2_relationship || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const updatedCustomer: Customer = {
      ...customer,
      customer_id_display: formData.customer_id_display,
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      aadhaar_number: formData.aadhaar_number,
      pan_number: formData.pan_number,
      additional_mobile_1: formData.additional_mobile_1,
      additional_mobile_1_relationship: formData.additional_mobile_1_relationship as any,
      additional_mobile_2: formData.additional_mobile_2,
      additional_mobile_2_relationship: formData.additional_mobile_2_relationship as any
    }
    onSave(updatedCustomer)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <h2 className="text-xl font-bold text-gray-900">Edit Customer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 self-end sm:self-auto"><X className="w-6 h-6" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer ID
                </label>
                <input
                  type="text"
                  value={formData.customer_id_display}
                  onChange={(e) => setFormData({ ...formData, customer_id_display: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., CUST001, CUST002"
                />
                <p className="text-xs text-gray-500 mt-1">Optional: Custom ID to display instead of system ID</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter customer name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter complete address"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhaar Number
                </label>
                <input
                  type="text"
                  value={formData.aadhaar_number}
                  onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter 12-digit Aadhaar number"
                  maxLength={12}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={formData.pan_number}
                  onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter PAN number"
                  maxLength={10}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Mobile 1
                </label>
                <input
                  type="tel"
                  value={formData.additional_mobile_1}
                  onChange={(e) => setFormData({ ...formData, additional_mobile_1: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter additional mobile number"
                  maxLength={10}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship (Mobile 1)
                </label>
                <select
                  value={formData.additional_mobile_1_relationship}
                  onChange={(e) => setFormData({ ...formData, additional_mobile_1_relationship: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select relationship</option>
                  <option value="Husband">Husband</option>
                  <option value="Wife">Wife</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Son">Son</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Mobile 2
                </label>
                <input
                  type="tel"
                  value={formData.additional_mobile_2}
                  onChange={(e) => setFormData({ ...formData, additional_mobile_2: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter additional mobile number"
                  maxLength={10}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship (Mobile 2)
                </label>
                <select
                  value={formData.additional_mobile_2_relationship}
                  onChange={(e) => setFormData({ ...formData, additional_mobile_2_relationship: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select relationship</option>
                  <option value="Husband">Husband</option>
                  <option value="Wife">Wife</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Son">Son</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Update Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Delete Confirmation Modal Component
function DeleteConfirmationModal({ 
  itemName, 
  itemDetails, 
  onClose, 
  onConfirm 
}: { 
  itemName: string
  itemDetails: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Delete {itemName.charAt(0).toUpperCase() + itemName.slice(1)}</h2>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete <strong>{itemDetails}</strong>? This action cannot be undone.
        </p>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
