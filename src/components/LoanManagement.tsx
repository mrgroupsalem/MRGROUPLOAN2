'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, X, AlertTriangle, CheckCircle, Download, Upload, Flame, CreditCard } from 'lucide-react'
import { Loan, Customer, Employee } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportLoans } from '@/lib/exportUtils'
import { supabase } from '@/lib/supabase'
import EmergencyLoanApplication from './EmergencyLoanApplication'
import AddLoanModal from './AddLoanModal'
import ImportLoansModal from './ImportLoansModal'

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
        // Load regular loans with related data
        const { data: loansData, error: loansError } = await supabase
          .from('loans')
          .select(`
            *,
            team_leader:employees(*)
          `)
        
        // Load emergency loans
        const { data: emergencyLoansData, error: emergencyLoansError } = await supabase
          .from('emergency_loans')
          .select('*')
        
        if (loansError) {
          console.error('Error loading loans:', loansError)
        }
        
        if (emergencyLoansError) {
          console.error('Error loading emergency loans:', emergencyLoansError)
        }
        
        // Process regular loans
        let allLoans: Loan[] = [];
        
        if (loansData) {
          // Manually join customer data for regular loans
          const loansWithCustomers = await Promise.all((loansData || []).map(async (loan) => {
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
          
          allLoans = [...loansWithCustomers];
        }
        
        // Process emergency loans
        if (emergencyLoansData) {
          // Convert emergency loans to match Loan interface format
          const emergencyLoansFormatted = await Promise.all((emergencyLoansData || []).map(async (emergencyLoan) => {
            // Find customer by mobile number or customer_id
            let { data: customerData } = await supabase
              .from('customers')
              .select('*')
              .or(`phone.eq.${emergencyLoan.mobile_number},customer_id_display.eq.${emergencyLoan.mobile_number}`)
              .single()
            
            // If customer not found by mobile, try to find by customer_id if it exists
            if (!customerData && emergencyLoan.customer_id) {
              ({ data: customerData } = await supabase
                .from('customers')
                .select('*')
                .eq('id', emergencyLoan.customer_id)
                .single())
            }
            
            // If still not found, create a placeholder customer object
            if (!customerData) {
              customerData = {
                id: emergencyLoan.customer_id || `emergency-${emergencyLoan.id}`,
                name: emergencyLoan.customer_name,
                phone: emergencyLoan.mobile_number,
                address: emergencyLoan.address || 'Address not available',
                customer_id_display: emergencyLoan.mobile_number
              }
            }
            
            // Convert emergency loan to match Loan interface
            return {
              id: emergencyLoan.id,
              customer_id: emergencyLoan.customer_id || customerData.id,
              customer: customerData,
              amount: emergencyLoan.loan_amount,
              status: emergencyLoan.status || 'active',
              start_date: emergencyLoan.start_date,
              end_date: emergencyLoan.end_date,
              created_at: emergencyLoan.created_at || new Date().toISOString(),
              loan_purpose: 'emergency', // Mark as emergency loan
              interest_rate: '0', // Emergency loans typically have 0% interest
              number_of_weeks: emergencyLoan.number_of_days,
              team_leader_id: emergencyLoan.team_leader_id || null,
              weekly_batch: undefined,
              customer_bank_name: undefined,
              account_number: undefined,
              ifsc_code: undefined
            }
          }))
          
          allLoans = [...allLoans, ...emergencyLoansFormatted];
        }
        
        // Set combined loans
        setLoans(allLoans);
        console.log('Loaded total loans (regular + emergency):', allLoans.length)
        console.log('Regular loans:', loansData?.length || 0)
        console.log('Emergency loans:', emergencyLoansData?.length || 0)

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

  const handleUpdateLoan = async (updatedLoan: any) => {
    try {
      if (updatedLoan.customer_update && Object.keys(updatedLoan.customer_update).length > 0) {
        const { error: customerError } = await supabase
          .from('customers')
          .update(updatedLoan.customer_update)
          .eq('id', updatedLoan.customer_id)
        if (customerError) throw new Error(customerError.message)
      }

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

      setLoans(loans.map(l => l.id === updatedLoan.id ? data[0] : l))
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
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[100vw] overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Loan Management</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            onClick={() => exportLoans(loans)}
            className="flex items-center space-x-2 px-3 py-2 md:px-4 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm md:text-base"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center space-x-2 px-3 py-2 md:px-4 md:py-2 border-2 border-primary-100 text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 hover:border-primary-200 transition-colors font-medium text-sm md:text-base"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>
          <button
            onClick={() => setShowLoanTypeModal(true)}
            className="btn-primary flex items-center space-x-2 px-3 py-2 md:px-4 md:py-2 text-sm md:text-base"
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
              {filteredLoans.map((loan) => (
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
          employees={employees}
          onClose={() => setShowAddModal(false)}
          onSave={(loan) => {
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
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
            // Reload loans to get the newly created emergency loan
            loadData()
            setShowEmergencyLoanForm(false)
          }}
        />
      )}

      {/* New Loan Form */}
      {showNewLoanForm && (
        <AddLoanModal
         customers={customers}
        employees={employees}
      onClose={() => setShowNewLoanForm(false)}
      onSave={(loan) => {
            setLoans([...loans, loan])
            setShowNewLoanForm(false)
          }}
        />
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <ImportLoansModal 
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            loadData()
            setShowImportModal(false)
          }}
        />
      )}
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
  onSave: (loan: any) => void
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
    ifsc_code: loan.ifsc_code || '',
    additional_mobile_1: loan.customer?.additional_mobile_1 || '',
    additional_mobile_1_relationship: loan.customer?.additional_mobile_1_relationship || '',
    additional_mobile_2: loan.customer?.additional_mobile_2 || '',
    additional_mobile_2_relationship: loan.customer?.additional_mobile_2_relationship || ''
  })

  const [photoUpload, setPhotoUpload] = useState<{
    file: File | null
    preview: string | null
    uploading: boolean
    uploadedUrl: string | null
  }>({
    file: null,
    preview: loan.customer?.photo_url || null,
    uploading: false,
    uploadedUrl: loan.customer?.photo_url || null
  })

  const relationships = [
    'Husband', 'Wife', 'Mother', 'Father', 'Daughter', 'Son', 'Brother', 'Sister', 'Other'
  ]
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return alert('Please select a valid image file')
    if (file.size > 5 * 1024 * 1024) return alert('Image size should be less than 5MB')
    setPhotoUpload({ file, preview: URL.createObjectURL(file), uploading: false, uploadedUrl: null })
  }

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoUpload.file) return null
    setPhotoUpload(prev => ({ ...prev, uploading: true }))
    try {
      const fileExt = photoUpload.file.name.split('.').pop()
      const fileName = `customer-photos/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const { error } = await supabase.storage.from('MRGroups').upload(fileName, photoUpload.file, { cacheControl: '3600', upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('MRGroups').getPublicUrl(fileName)
      setPhotoUpload(prev => ({ ...prev, uploading: false, uploadedUrl: data.publicUrl }))
      return data.publicUrl
    } catch (err: any) {
      console.error('Upload Error', err)
      setPhotoUpload(prev => ({ ...prev, uploading: false }))
      alert('Photo upload failed')
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
      let customerPhotoUrl = photoUpload.uploadedUrl
      if (photoUpload.file && !customerPhotoUrl) {
        customerPhotoUrl = await uploadPhoto()
      }

      const updatedLoan: any = {
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
        ifsc_code: formData.ifsc_code || undefined,
        customer_update: {
          additional_mobile_1: formData.additional_mobile_1 || null,
          additional_mobile_1_relationship: formData.additional_mobile_1_relationship || null,
          additional_mobile_2: formData.additional_mobile_2 || null,
          additional_mobile_2_relationship: formData.additional_mobile_2_relationship || null,
          photo_url: customerPhotoUrl || null
        }
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
              {customers.map((customer) => (
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
              {employees.map((employee) => (
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Mobile 1
              </label>
              <input
                type="tel"
                value={formData.additional_mobile_1}
                onChange={(e) => handleInputChange('additional_mobile_1', e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile 1 Relationship
              </label>
              <select
                value={formData.additional_mobile_1_relationship}
                onChange={(e) => handleInputChange('additional_mobile_1_relationship', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select relationship</option>
                {relationships.map(rel => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Mobile 2
              </label>
              <input
                type="tel"
                value={formData.additional_mobile_2}
                onChange={(e) => handleInputChange('additional_mobile_2', e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile 2 Relationship
              </label>
              <select
                value={formData.additional_mobile_2_relationship}
                onChange={(e) => handleInputChange('additional_mobile_2_relationship', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select relationship</option>
                {relationships.map(rel => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Photo
            </label>
            <div className="flex items-start space-x-4">
              {photoUpload.preview && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-300">
                  <img
                    src={photoUpload.preview}
                    alt="Customer preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => document.getElementById('edit-modal-photo-upload-input')?.click()}
                  disabled={photoUpload.uploading}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                    photoUpload.uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {photoUpload.uploading ? 'Uploading...' : photoUpload.uploadedUrl ? 'Change Photo' : 'Choose Photo'}
                </button>
                <input
                  id="edit-modal-photo-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  disabled={photoUpload.uploading}
                />
              </div>
            </div>
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