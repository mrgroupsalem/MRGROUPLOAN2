'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, X, AlertTriangle, CheckCircle, Download, Upload, Flame, CreditCard } from 'lucide-react'
import { Loan, Customer, Employee } from './src/types'
import { formatCurrency, formatDate } from './src/lib/utils'
import { exportLoans } from './src/lib/exportUtils'
import { supabase } from './src/lib/supabase'
import EmergencyLoanApplication from './src/components/EmergencyLoanApplication'

interface LoanManagementProps {
  onBack: () => void
}

// Helper function to check if a loan is an emergency loan
const isEmergencyLoan = (loan: Loan) => {
  return loan.loan_purpose === 'emergency';
};

export default function LoanManagement({ onBack }: LoanManagementProps) {
  const [loans, setLoans] = useState<Loan[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed' | 'pending'>('all')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null)
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null)
  const [showNewLoanForm, setShowNewLoanForm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showLoanTypeModal, setShowLoanTypeModal] = useState(false)
  const [showEmergencyLoanForm, setShowEmergencyLoanForm] = useState(false)

  // Load data from Supabase
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
          // Manually join customer data since there's no direct foreign key relationship in the query
          const loansWithCustomers = await Promise.all((loansData || []).map(async (loan: Loan) => {
            // Find customer by matching loan.customer_id (UUID) with customer.id (UUID)
            let { data: customerData } = await supabase
              .from('customers')
              .select('*')
              .eq('id', loan.customer_id)
              .single()
            
            // If still not found, create a placeholder customer object
            if (!customerData) {
              customerData = {
                id: `placeholder-${loan.customer_id}`,
                name: `Customer ${loan.customer_id}`,
                phone: loan.customer_id,
                address: 'Address not available',
                customer_id_display: loan.customer_id
              }
            }
            
            return {
              ...loan,
              customer: customerData
            }
          }))
          
          // Keep all loans; we'll filter visually below
          setLoans(loansWithCustomers)
          console.log('Loaded loans with customers:', loansWithCustomers.length)
        }

        // Load customers
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
        
        if (customersError) {
          console.error('Error loading customers:', customersError)
        } else {
          setCustomers(customersData || [])
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
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.customer?.phone.includes(searchTerm)
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleEditLoan = (loan: Loan) => {
    setLoanToEdit(loan)
    setShowEditModal(true)
  }

  const handleDeleteLoan = (loan: Loan) => {
    setLoanToDelete(loan)
    setShowDeleteModal(true)
  }

  const confirmDeleteLoan = async () => {
    if (!loanToDelete) return
    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanToDelete.id)

      if (error) {
        throw new Error(error.message)
      }

      setLoans(loans.filter(l => l.id !== loanToDelete.id))
      setShowDeleteModal(false)
      setLoanToDelete(null)
      alert('Loan deleted successfully')
    } catch (error: any) {
      console.error('Error deleting loan:', error)
      alert(`Error deleting loan: ${error.message}`)
    }
  }

  const handleUpdateLoan = async (updatedLoan: Loan) => {
    try {
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
        .select()

      if (error) {
        throw new Error(error.message)
      }

      setLoans(loans.map((l: Loan) => l.id === updatedLoan.id ? data[0] : l))
      setShowEditModal(false)
      setLoanToEdit(null)
      alert('Loan updated successfully!')
    } catch (error: any) {
      console.error('Error updating loan:', error)
      alert(`Error updating loan: ${error.message}`)
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Loan Management</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => exportLoans(loans)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowLoanTypeModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Loan</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLoans.map((loan: Loan) => (
                <tr key={loan.id} className={`${isEmergencyLoan(loan) ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isEmergencyLoan(loan) ? 'text-red-800' : 'text-gray-900'}`}>
                    {loan.customer?.customer_id_display || loan.customer_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className={`text-sm font-medium ${isEmergencyLoan(loan) ? 'text-red-800' : 'text-gray-900'}`}>
                        {loan.customer?.name}
                      </div>
                      <div className={`text-sm ${isEmergencyLoan(loan) ? 'text-red-600' : 'text-gray-500'}`}>
                        {loan.customer?.phone}
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isEmergencyLoan(loan) ? 'text-red-800' : 'text-gray-900'}`}>
                    {formatCurrency(loan.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(loan.status)} ${isEmergencyLoan(loan) ? 'ring-1 ring-red-300' : ''}`}>
                      {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isEmergencyLoan(loan) ? 'text-red-800' : 'text-gray-900'}`}>
                    {formatDate(loan.start_date)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isEmergencyLoan(loan) ? 'text-red-800' : 'text-gray-900'}`}>
                    {formatDate(loan.end_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedLoan(loan)}
                        className={isEmergencyLoan(loan) ? "text-red-600 hover:text-red-900" : "text-primary-600 hover:text-primary-900"}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditLoan(loan)}
                        className={isEmergencyLoan(loan) ? "text-red-600 hover:text-red-900" : "text-gray-600 hover:text-gray-900"}
                        title="Edit Loan"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteLoan(loan)}
                        className={isEmergencyLoan(loan) ? "text-red-600 hover:text-red-900" : "text-red-600 hover:text-red-900"}
                        title="Delete Loan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Loan Modal */}
      {showAddModal && (
        <AddLoanModal
          customers={customers}
          onClose={() => setShowAddModal(false)}
          onSave={(loan: Loan) => {
            setLoans([...loans, loan])
            setShowAddModal(false)
          }}
        />
      )}

      {/* Loan Details Modal */}
      {selectedLoan && (
        <LoanDetailsModal
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
        />
      )}

      {/* Edit Loan Modal */}
      {showEditModal && loanToEdit && (
        <EditLoanModal
          loan={loanToEdit}
          customers={customers}
          employees={employees}
          onClose={() => {
            setShowEditModal(false)
            setLoanToEdit(null)
          }}
          onSave={handleUpdateLoan}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && loanToDelete && (
        <DeleteConfirmationModal
          itemName="loan"
          itemDetails={`Loan #${loanToDelete.id}`}
          onClose={() => {
            setShowDeleteModal(false)
            setLoanToDelete(null)
          }}
          onConfirm={confirmDeleteLoan}
        />
      )}

      {/* Loan Type Selection Modal */}
      {showLoanTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Select Loan Type</h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setShowLoanTypeModal(false)
                  setShowNewLoanForm(true)
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Regular Loan</h3>
                    <p className="text-sm text-gray-500">Standard loan with weekly repayments</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  setShowLoanTypeModal(false)
                  setShowEmergencyLoanForm(true)
                }}
                className="w-full p-4 border-2 border-red-300 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all text-left group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                    <Flame className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-red-800">Emergency Loan</h3>
                    <p className="text-sm text-red-600">Quick emergency loan with short-term repayment (5-10 days)</p>
                  </div>
                </div>
              </button>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowLoanTypeModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Loan Form */}
      {showEmergencyLoanForm && (
        <EmergencyLoanApplication
          onClose={() => setShowEmergencyLoanForm(false)}
          onSuccess={() => {
            // Refresh the data to get the newly created emergency loan
            loadData();
            setShowEmergencyLoanForm(false)
          }}
        />
      )}

      {/* New Loan Form */}
      {showNewLoanForm && (
        <AddLoanModal
          customers={customers}
          onClose={() => setShowNewLoanForm(false)}
          onSave={(loan: Loan) => {
            setLoans([...loans, loan])
            setShowNewLoanForm(false)
          }}
        />
      )}
    </div>
  )
}

// Add Loan Modal Component
function AddLoanModal({ 
  customers, 
  onClose, 
  onSave 
}: { 
  customers: Customer[]
  onClose: () => void
  onSave: (loan: Loan) => void
}) {
  const [formData, setFormData] = useState({
    customer_id: '',
    amount: '',
    status: 'pending',
    start_date: '',
    end_date: '',
    interest_rate: '8.33',
    number_of_weeks: '15',
    team_leader_id: '',
    weekly_batch: '',
    loan_purpose: '',
    customer_bank_name: '',
    account_number: '',
    ifsc_code: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    const newErrors: Record<string, string> = {}
    
    if (!formData.customer_id) newErrors.customer_id = 'Customer is required'
    if (!formData.amount) newErrors.amount = 'Amount is required'
    if (!formData.start_date) newErrors.start_date = 'Start date is required'
    if (!formData.end_date) newErrors.end_date = 'End date is required'
    if (!formData.team_leader_id) newErrors.team_leader_id = 'Team leader is required'
    if (!formData.weekly_batch) newErrors.weekly_batch = 'Weekly batch is required'
    if (!formData.loan_purpose) newErrors.loan_purpose = 'Loan purpose is required'

    // Amount validation
    if (formData.amount && (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0)) {
      newErrors.amount = 'Please enter a valid amount'
    }

    // Date validation
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date)
      const endDate = new Date(formData.end_date)
      if (startDate >= endDate) {
        newErrors.end_date = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    
    if (Object.keys(newErrors).length === 0) {
      const newLoan: Loan = {
        id: Date.now().toString(),
        customer_id: formData.customer_id,
        amount: Number(formData.amount),
        status: formData.status as 'active' | 'closed' | 'pending',
        start_date: formData.start_date,
        end_date: formData.end_date,
        interest_rate: formData.interest_rate,
        number_of_weeks: Number(formData.number_of_weeks),
        team_leader_id: formData.team_leader_id,
        weekly_batch: formData.weekly_batch as 'tuesday' | 'thursday' | 'friday' | undefined,
        loan_purpose: formData.loan_purpose,
        customer_bank_name: formData.customer_bank_name || undefined,
        account_number: formData.account_number || undefined,
        ifsc_code: formData.ifsc_code || undefined,
        created_at: new Date().toISOString()
      }
      onSave(newLoan)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Add New Loan</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer *
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => handleInputChange('customer_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.customer_id ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select a customer</option>
              {customers.map((customer: Customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.phone})
                </option>
              ))}
            </select>
            {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.amount ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter loan amount"
              step="100"
              min="0"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.start_date ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.end_date ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interest Rate (%)
              </label>
              <input
                type="number"
                value={formData.interest_rate}
                onChange={(e) => handleInputChange('interest_rate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Weeks
              </label>
              <input
                type="number"
                value={formData.number_of_weeks}
                onChange={(e) => handleInputChange('number_of_weeks', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Leader *
            </label>
            <select
              value={formData.team_leader_id}
              onChange={(e) => handleInputChange('team_leader_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.team_leader_id ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select team leader</option>
              {/* Team leaders would be loaded here */}
            </select>
            {errors.team_leader_id && <p className="text-red-500 text-xs mt-1">{errors.team_leader_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weekly Batch *
            </label>
            <select
              value={formData.weekly_batch}
              onChange={(e) => handleInputChange('weekly_batch', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.weekly_batch ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select collection day</option>
              <option value="tuesday">Tuesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
            </select>
            {errors.weekly_batch && <p className="text-red-500 text-xs mt-1">{errors.weekly_batch}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loan Purpose *
            </label>
            <input
              type="text"
              value={formData.loan_purpose}
              onChange={(e) => handleInputChange('loan_purpose', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.loan_purpose ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="e.g., Business expansion, Education, Medical emergency"
            />
            {errors.loan_purpose && <p className="text-red-500 text-xs mt-1">{errors.loan_purpose}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.customer_bank_name}
                onChange={(e) => handleInputChange('customer_bank_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter bank name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={formData.account_number}
                onChange={(e) => handleInputChange('account_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter account number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IFSC Code
            </label>
            <input
              type="text"
              value={formData.ifsc_code}
              onChange={(e) => handleInputChange('ifsc_code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter IFSC code"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Save Loan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Loan Details Modal Component
function LoanDetailsModal({ 
  loan, 
  onClose 
}: { 
  loan: Loan
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Loan Details</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            <p className="text-sm text-gray-900">{loan.customer?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <p className="text-sm text-gray-900">{formatCurrency(loan.amount)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${loan.status === 'active' ? 'bg-green-100 text-green-800' : loan.status === 'closed' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <p className="text-sm text-gray-900">{formatDate(loan.start_date)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <p className="text-sm text-gray-900">{formatDate(loan.end_date)}</p>
          </div>
          {loan.loan_purpose && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Purpose</label>
              <p className="text-sm text-gray-900">{loan.loan_purpose}</p>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Edit Loan Modal Component
function EditLoanModal({ 
  loan, 
  customers, 
  employees, 
  onClose, 
  onSave 
}: { 
  loan: Loan
  customers: Customer[]
  employees: Employee[]
  onClose: () => void
  onSave: (loan: Loan) => void
}) {
  const [formData, setFormData] = useState({
    customer_id: loan.customer_id,
    amount: loan.amount.toString(),
    status: loan.status,
    start_date: loan.start_date,
    end_date: loan.end_date,
    interest_rate: loan.interest_rate || '8.33',
    number_of_weeks: loan.number_of_weeks?.toString() || '15',
    team_leader_id: loan.team_leader_id || '',
    weekly_batch: loan.weekly_batch || '',
    loan_purpose: loan.loan_purpose || '',
    customer_bank_name: loan.customer_bank_name || '',
    account_number: loan.account_number || '',
    ifsc_code: loan.ifsc_code || ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    const newErrors: Record<string, string> = {}
    
    if (!formData.customer_id) newErrors.customer_id = 'Customer is required'
    if (!formData.amount) newErrors.amount = 'Amount is required'
    if (!formData.start_date) newErrors.start_date = 'Start date is required'
    if (!formData.end_date) newErrors.end_date = 'End date is required'
    if (!formData.team_leader_id) newErrors.team_leader_id = 'Team leader is required'
    if (!formData.weekly_batch) newErrors.weekly_batch = 'Weekly batch is required'
    if (!formData.loan_purpose) newErrors.loan_purpose = 'Loan purpose is required'

    // Amount validation
    if (formData.amount && (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0)) {
      newErrors.amount = 'Please enter a valid amount'
    }

    // Date validation
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date)
      const endDate = new Date(formData.end_date)
      if (startDate >= endDate) {
        newErrors.end_date = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    
    if (Object.keys(newErrors).length === 0) {
      const updatedLoan: Loan = {
        ...loan,
        customer_id: formData.customer_id,
        amount: Number(formData.amount),
        status: formData.status as 'active' | 'closed' | 'pending',
        start_date: formData.start_date,
        end_date: formData.end_date,
        interest_rate: formData.interest_rate,
        number_of_weeks: Number(formData.number_of_weeks),
        team_leader_id: formData.team_leader_id,
        weekly_batch: formData.weekly_batch as 'tuesday' | 'thursday' | 'friday' | undefined,
        loan_purpose: formData.loan_purpose,
        customer_bank_name: formData.customer_bank_name || undefined,
        account_number: formData.account_number || undefined,
        ifsc_code: formData.ifsc_code || undefined
      }
      onSave(updatedLoan)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Edit Loan</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer *
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => handleInputChange('customer_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.customer_id ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select a customer</option>
              {customers.map((customer: Customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.phone})
                </option>
              ))}
            </select>
            {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.amount ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter loan amount"
              step="100"
              min="0"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.start_date ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.end_date ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interest Rate (%)
              </label>
              <input
                type="number"
                value={formData.interest_rate}
                onChange={(e) => handleInputChange('interest_rate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Weeks
              </label>
              <input
                type="number"
                value={formData.number_of_weeks}
                onChange={(e) => handleInputChange('number_of_weeks', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Leader *
            </label>
            <select
              value={formData.team_leader_id}
              onChange={(e) => handleInputChange('team_leader_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.team_leader_id ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select team leader</option>
              {employees.map((employee: Employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            {errors.team_leader_id && <p className="text-red-500 text-xs mt-1">{errors.team_leader_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weekly Batch *
            </label>
            <select
              value={formData.weekly_batch}
              onChange={(e) => handleInputChange('weekly_batch', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.weekly_batch ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select collection day</option>
              <option value="tuesday">Tuesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
            </select>
            {errors.weekly_batch && <p className="text-red-500 text-xs mt-1">{errors.weekly_batch}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loan Purpose *
            </label>
            <input
              type="text"
              value={formData.loan_purpose}
              onChange={(e) => handleInputChange('loan_purpose', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.loan_purpose ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="e.g., Business expansion, Education, Medical emergency"
            />
            {errors.loan_purpose && <p className="text-red-500 text-xs mt-1">{errors.loan_purpose}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.customer_bank_name}
                onChange={(e) => handleInputChange('customer_bank_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter bank name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={formData.account_number}
                onChange={(e) => handleInputChange('account_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter account number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IFSC Code
            </label>
            <input
              type="text"
              value={formData.ifsc_code}
              onChange={(e) => handleInputChange('ifsc_code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter IFSC code"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Update Loan
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
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}