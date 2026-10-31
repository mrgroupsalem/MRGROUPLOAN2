'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Plus, 
  Eye, 
  Download,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Users,
  TrendingUp,
  X,
  Edit,
  Trash2,
  BarChart3
} from 'lucide-react'
import { Employee, Loan, Customer, Collection } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportWorkers } from '@/lib/exportUtils'
import { supabase } from '@/lib/supabase'

interface WorkersProps {
  onBack: () => void
}

export default function Workers({ onBack }: WorkersProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWorker, setSelectedWorker] = useState<Employee | null>(null)
  const [showWorkerDetails, setShowWorkerDetails] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [workerToEdit, setWorkerToEdit] = useState<Employee | null>(null)
  const [showPerformanceChart, setShowPerformanceChart] = useState(false)

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load employees
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('*')
        
        if (employeesError) {
          console.error('Error loading employees:', employeesError)
        } else {
          // Normalize leader_id: use DB leader_id if present, otherwise extract from name
          const normalized = (employeesData || []).map(emp => ({
            ...emp,
            leader_id: emp.leader_id || emp.name?.match(/\b(\d{3})\b/)?.[1] || undefined
          }))
          setEmployees(normalized)
        }

        // Load loans with related data
        const { data: loansData, error: loansError } = await supabase
          .from('loans')
          .select(`
            *,
            customer:customers(*),
            team_leader:employees(*)
          `)
        
        if (loansError) {
          console.error('Error loading loans:', loansError)
        } else {
          setLoans(loansData || [])
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

        // Load collections with related data
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select(`
            *,
            customer:customers(*),
            loan:loans(*),
            worker:employees(*)
          `)
        
        if (collectionsError) {
          console.error('Error loading collections:', collectionsError)
        } else {
          setCollections(collectionsData || [])
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.leader_id && employee.leader_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (employee.email && employee.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    employee.designation.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getWorkerStats = (workerId: string) => {
    const workerLoans = loans.filter(loan => loan.team_leader_id === workerId)
    const workerCustomers = customers.filter(customer => 
      workerLoans.some(loan => loan.customer_id === customer.id)
    )
    const totalLoanAmount = workerLoans.reduce((sum, loan) => sum + loan.amount, 0)
    const workerCollections = collections.filter(collection => collection.worker_id === workerId)
    const totalCollected = workerCollections.reduce((sum, collection) => sum + collection.amount_collected, 0)

    return {
      customerCount: workerCustomers.length,
      loanCount: workerLoans.length,
      totalLoanAmount,
      totalCollected
    }
  }

  const handleViewWorker = (worker: Employee) => {
    setSelectedWorker(worker)
    setShowWorkerDetails(true)
  }

  const handleEditWorker = (worker: Employee) => {
    setWorkerToEdit(worker)
    setShowEditModal(true)
  }

  const handleDeleteWorker = async (workerId: string) => {
    if (confirm('Are you sure you want to delete this worker?')) {
      try {
        // Delete employee from Supabase
        const { error } = await supabase
          .from('employees')
          .delete()
          .eq('id', workerId)

        if (error) {
          console.error('Error deleting worker:', error)
          alert('Error deleting worker. Please try again.')
          return
        }

        // Update local state
        setEmployees(employees.filter(emp => emp.id !== workerId))
        alert('Worker deleted successfully!')
      } catch (error) {
        console.error('Error deleting worker:', error)
        alert('Error deleting worker. Please try again.')
      }
    }
  }

  const handleAddWorker = async (newWorker: Employee) => {
    try {
      // Validate Leader ID format (exactly 3 digits)
      if (newWorker.leader_id && !/^\d{3}$/.test(newWorker.leader_id.trim())) {
        alert('Leader ID must contain exactly 3 digits (e.g., 421, 473, 388, 222).')
        return
      }

      // Check for duplicate Leader ID in database
      if (newWorker.leader_id) {
        const cleanLeaderId = newWorker.leader_id.trim()
        const { data: existingEmployees } = await supabase
          .from('employees')
          .select('id, name, leader_id')

        const duplicate = existingEmployees?.find(emp => 
          (emp.leader_id && emp.leader_id === cleanLeaderId) ||
          (emp.name && emp.name.match(/\b\d{3}\b/)?.[0] === cleanLeaderId)
        )

        if (duplicate) {
          alert(`Leader ID "${cleanLeaderId}" already exists (assigned to ${duplicate.name}). Please use a unique Leader ID.`)
          return
        }
      }

      const generatedId = `TL${Date.now().toString(36).toUpperCase()}`

      // Include leader_id in worker name if not already there so customerIdGenerator and TL dropdowns detect it
      let finalName = newWorker.name.trim()
      if (newWorker.leader_id && !finalName.includes(newWorker.leader_id)) {
        finalName = `${finalName} ${newWorker.leader_id}`
      }

      const insertPayload: any = {
        id: generatedId,
        name: finalName,
        phone: newWorker.phone,
        designation: newWorker.designation,
        department: newWorker.department,
        ...(newWorker.email ? { email: newWorker.email } : {})
      }

      if (newWorker.leader_id) {
        insertPayload.leader_id = newWorker.leader_id.trim()
      }

      // Attempt insert with leader_id
      let { data, error } = await supabase
        .from('employees')
        .insert(insertPayload)
        .select()

      // If leader_id column is not yet migrated in Supabase, fallback without it
      if (error && error.message?.includes('leader_id')) {
        delete insertPayload.leader_id
        const fallback = await supabase
          .from('employees')
          .insert(insertPayload)
          .select()
        data = fallback.data
        error = fallback.error
      }

      if (error || !data || data.length === 0) {
        console.error('Error adding worker:', error)
        alert(`Error adding worker: ${error?.message || 'Please try again.'}`)
        return
      }

      const savedWorker = { ...data[0], leader_id: newWorker.leader_id }
      // Update local state
      setEmployees([...employees, savedWorker])
      setShowAddModal(false)
      alert(`Worker added successfully! Leader ID: ${newWorker.leader_id || 'N/A'}`)
    } catch (error) {
      console.error('Error adding worker:', error)
      alert(`Error adding worker: ${error instanceof Error ? error.message : 'Please try again.'}`)
    }
  }

  const handleUpdateWorker = async (updatedWorker: Employee) => {
    try {
      // Validate Leader ID format if provided
      if (updatedWorker.leader_id && !/^\d{3}$/.test(updatedWorker.leader_id.trim())) {
        alert('Leader ID must contain exactly 3 digits (e.g., 421, 473, 388, 222).')
        return
      }

      // Check for duplicate Leader ID in database
      if (updatedWorker.leader_id) {
        const cleanLeaderId = updatedWorker.leader_id.trim()
        const { data: existingEmployees } = await supabase
          .from('employees')
          .select('id, name, leader_id')

        const duplicate = existingEmployees?.find(emp => 
          emp.id !== updatedWorker.id && (
            (emp.leader_id && emp.leader_id === cleanLeaderId) ||
            (emp.name && emp.name.match(/\b\d{3}\b/)?.[0] === cleanLeaderId)
          )
        )

        if (duplicate) {
          alert(`Leader ID "${cleanLeaderId}" already exists (assigned to ${duplicate.name}). Please use a unique Leader ID.`)
          return
        }
      }

      let finalName = updatedWorker.name.trim()
      if (updatedWorker.leader_id && !finalName.includes(updatedWorker.leader_id)) {
        if (/\b\d{3}\b/.test(finalName)) {
          finalName = finalName.replace(/\b\d{3}\b/, updatedWorker.leader_id)
        } else {
          finalName = `${finalName} ${updatedWorker.leader_id}`
        }
      }

      const updatePayload: any = {
        name: finalName,
        phone: updatedWorker.phone,
        designation: updatedWorker.designation,
        department: updatedWorker.department,
        ...(updatedWorker.email ? { email: updatedWorker.email } : {})
      }

      if (updatedWorker.leader_id) {
        updatePayload.leader_id = updatedWorker.leader_id.trim()
      }

      let { data, error } = await supabase
        .from('employees')
        .update(updatePayload)
        .eq('id', updatedWorker.id)
        .select()

      if (error && error.message?.includes('leader_id')) {
        delete updatePayload.leader_id
        const fallback = await supabase
          .from('employees')
          .update(updatePayload)
          .eq('id', updatedWorker.id)
          .select()
        data = fallback.data
        error = fallback.error
      }

      if (error || !data || data.length === 0) {
        console.error('Error updating worker:', error)
        alert('Error updating worker. Please try again.')
        return
      }

      const savedWorker = { ...data[0], leader_id: updatedWorker.leader_id }
      // Update local state
      setEmployees(employees.map(emp => 
        emp.id === updatedWorker.id ? savedWorker : emp
      ))
      
      setShowEditModal(false)
      setWorkerToEdit(null)
      alert('Worker updated successfully!')
    } catch (error) {
      console.error('Error updating worker:', error)
      alert('Error updating worker. Please try again.')
    }
  }

  const handleExport = () => {
    exportWorkers(employees, loans, customers)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
            <p className="text-gray-600">Manage employees and their assignments</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowPerformanceChart(!showPerformanceChart)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{showPerformanceChart ? 'Hide' : 'Show'} Performance</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Worker</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Workers</p>
              <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <User className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Workers</p>
              <p className="text-2xl font-bold text-gray-900">
                {employees.filter(emp => getWorkerStats(emp.id).customerCount > 0).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {employees.reduce((sum, emp) => sum + getWorkerStats(emp.id).customerCount, 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Collections</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(employees.reduce((sum, emp) => sum + getWorkerStats(emp.id).totalCollected, 0))}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      {showPerformanceChart && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Worker Performance Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-3">Customers per Worker</h4>
              <div className="space-y-3">
                {employees.map(worker => {
                  const stats = getWorkerStats(worker.id)
                  return (
                    <div key={worker.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{worker.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min((stats.customerCount / Math.max(...employees.map(emp => getWorkerStats(emp.id).customerCount))) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{stats.customerCount}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-3">Loan Amount per Worker</h4>
              <div className="space-y-3">
                {employees.map(worker => {
                  const stats = getWorkerStats(worker.id)
                  const maxAmount = Math.max(...employees.map(emp => getWorkerStats(emp.id).totalLoanAmount))
                  return (
                    <div key={worker.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{worker.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${maxAmount > 0 ? (stats.totalLoanAmount / maxAmount) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(stats.totalLoanAmount)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search workers by name, leader ID, or designation..."
            className="pl-10 input-field"
          />
        </div>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredEmployees.map((worker) => {
          const stats = getWorkerStats(worker.id)
          const leaderCode = worker.leader_id || worker.name.match(/\b(\d{3})\b/)?.[1]
          return (
            <div key={worker.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{worker.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {leaderCode && (
                        <span className="text-xs font-bold font-mono px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                          ID: {leaderCode}
                        </span>
                      )}
                      <p className="text-sm text-gray-600">{worker.designation}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEditWorker(worker)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Edit Worker"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWorker(worker.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete Worker"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {leaderCode && (
                  <div className="flex items-center text-sm text-blue-700 font-medium">
                    <span className="w-4 h-4 mr-2 flex items-center justify-center font-bold text-xs bg-blue-100 text-blue-700 rounded font-mono">#</span>
                    <span>Leader ID: <strong className="font-mono">{leaderCode}</strong></span>
                  </div>
                )}
                {worker.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{worker.email}</span>
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>{worker.phone}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{worker.department}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.customerCount}</p>
                  <p className="text-xs text-gray-600">Customers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.loanCount}</p>
                  <p className="text-xs text-gray-600">Loans</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Total Loan Amount</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats.totalLoanAmount)}</p>
              </div>

              <button
                onClick={() => handleViewWorker(worker)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>View Details</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Worker Details Modal */}
      {showWorkerDetails && selectedWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{selectedWorker.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {(selectedWorker.leader_id || selectedWorker.name.match(/\b(\d{3})\b/)?.[1]) && (
                    <span className="text-sm font-bold font-mono px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                      Leader ID: {selectedWorker.leader_id || selectedWorker.name.match(/\b(\d{3})\b/)?.[1]}
                    </span>
                  )}
                  <span className="text-sm text-gray-600">{selectedWorker.designation} • {selectedWorker.department}</span>
                </div>
              </div>
              <button
                onClick={() => setShowWorkerDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Total Customers</h3>
                <p className="text-2xl font-bold text-blue-900">{getWorkerStats(selectedWorker.id).customerCount}</p>
                <p className="text-sm text-blue-700">Assigned Customers</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Total Loans</h3>
                <p className="text-2xl font-bold text-green-900">{getWorkerStats(selectedWorker.id).loanCount}</p>
                <p className="text-sm text-green-700">Managed Loans</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">Total Amount</h3>
                <p className="text-2xl font-bold text-purple-900">{formatCurrency(getWorkerStats(selectedWorker.id).totalLoanAmount)}</p>
                <p className="text-sm text-purple-700">Loan Value</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Customers</h3>
              {(() => {
                const workerLoans = loans.filter(loan => loan.team_leader_id === selectedWorker.id)
                const workerCustomers = customers.filter(customer => 
                  workerLoans.some(loan => loan.customer_id === customer.id)
                )
                
                return workerCustomers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {workerCustomers.map((customer) => {
                          const customerLoan = workerLoans.find(loan => loan.customer_id === customer.id)
                          return (
                            <tr key={customer.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {customer.customer_id_display || customer.id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                  <div className="text-sm text-gray-500">{customer.phone}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {customerLoan?.id || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {customerLoan ? formatCurrency(customerLoan.amount) : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  customerLoan?.status === 'active' ? 'bg-green-100 text-green-800' :
                                  customerLoan?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {customerLoan?.status ? customerLoan.status.charAt(0).toUpperCase() + customerLoan.status.slice(1) : 'N/A'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No customers assigned</p>
                    <p className="text-sm">This worker has no assigned customers yet.</p>
                  </div>
                )
              })()}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowWorkerDetails(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Worker Modal */}
      {showAddModal && (
        <AddWorkerModal
          existingEmployees={employees}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddWorker}
        />
      )}

      {/* Edit Worker Modal */}
      {showEditModal && workerToEdit && (
        <EditWorkerModal
          worker={workerToEdit}
          existingEmployees={employees}
          onClose={() => {
            setShowEditModal(false)
            setWorkerToEdit(null)
          }}
          onSave={handleUpdateWorker}
        />
      )}
    </div>
  )
}

// Add Worker Modal Component
function AddWorkerModal({ 
  existingEmployees,
  onClose, 
  onSave 
}: { 
  existingEmployees: Employee[]
  onClose: () => void
  onSave: (worker: Employee) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    leader_id: '',
    phone: '',
    designation: '',
    department: ''
  })
  const [leaderIdError, setLeaderIdError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const cleanId = formData.leader_id.trim()
    if (!cleanId) {
      setLeaderIdError('Leader ID is required.')
      return
    }

    if (!/^\d{3}$/.test(cleanId)) {
      setLeaderIdError('Leader ID must contain exactly 3 digits (e.g., 421, 473, 388, 222).')
      return
    }

    // Check duplicate
    const duplicate = existingEmployees.find(emp => 
      (emp.leader_id && emp.leader_id.trim() === cleanId) ||
      (emp.name && emp.name.match(/\b\d{3}\b/)?.[0] === cleanId)
    )
    if (duplicate) {
      setLeaderIdError(`Leader ID "${cleanId}" already exists (assigned to ${duplicate.name}). Please enter a unique Leader ID.`)
      return
    }

    const newWorker: Employee = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      leader_id: cleanId,
      phone: formData.phone.trim(),
      designation: formData.designation.trim(),
      department: formData.department,
      created_at: new Date().toISOString().split('T')[0]
    }
    onSave(newWorker)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Add New Worker</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="Enter worker full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leader ID</label>
            <input
              type="text"
              value={formData.leader_id}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 3)
                setFormData({ ...formData, leader_id: val })
                if (leaderIdError) setLeaderIdError(null)
              }}
              placeholder="e.g. 421, 473, 388, 222"
              className={`input-field font-mono ${leaderIdError ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              maxLength={3}
              required
            />
            {leaderIdError && (
              <p className="text-red-500 text-xs mt-1 font-medium">{leaderIdError}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Unique 3-digit Team Leader ID (numbers only)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              className="input-field"
              placeholder="10-digit mobile number"
              maxLength={10}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
            <input
              type="text"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="input-field"
              placeholder="e.g. Leader, Field Officer"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="input-field"
              required
            >
              <option value="">Select Department</option>
              <option value="Operations">Operations</option>
              <option value="Collections">Collections</option>
              <option value="Management">Management</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
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
              Add Worker
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Worker Modal Component
function EditWorkerModal({ 
  worker, 
  existingEmployees,
  onClose, 
  onSave 
}: { 
  worker: Employee
  existingEmployees: Employee[]
  onClose: () => void
  onSave: (worker: Employee) => void
}) {
  const initialLeaderId = worker.leader_id || worker.name.match(/\b(\d{3})\b/)?.[1] || ''
  const [formData, setFormData] = useState({
    name: worker.name,
    leader_id: initialLeaderId,
    phone: worker.phone,
    designation: worker.designation,
    department: worker.department,
    email: worker.email || '' // preserve existing email
  })
  const [leaderIdError, setLeaderIdError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const cleanId = formData.leader_id.trim()
    if (!cleanId) {
      setLeaderIdError('Leader ID is required.')
      return
    }

    if (!/^\d{3}$/.test(cleanId)) {
      setLeaderIdError('Leader ID must contain exactly 3 digits (e.g., 421, 473, 388, 222).')
      return
    }

    // Check duplicate (exclude current worker)
    const duplicate = existingEmployees.find(emp => 
      emp.id !== worker.id && (
        (emp.leader_id && emp.leader_id.trim() === cleanId) ||
        (emp.name && emp.name.match(/\b\d{3}\b/)?.[0] === cleanId)
      )
    )
    if (duplicate) {
      setLeaderIdError(`Leader ID "${cleanId}" already exists (assigned to ${duplicate.name}). Please enter a unique Leader ID.`)
      return
    }

    const updatedWorker: Employee = {
      ...worker,
      name: formData.name.trim(),
      leader_id: cleanId,
      phone: formData.phone.trim(),
      designation: formData.designation.trim(),
      department: formData.department,
      email: formData.email
    }
    onSave(updatedWorker)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Edit Worker</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leader ID</label>
            <input
              type="text"
              value={formData.leader_id}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 3)
                setFormData({ ...formData, leader_id: val })
                if (leaderIdError) setLeaderIdError(null)
              }}
              placeholder="e.g. 421, 473, 388, 222"
              className={`input-field font-mono ${leaderIdError ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              maxLength={3}
              required
            />
            {leaderIdError && (
              <p className="text-red-500 text-xs mt-1 font-medium">{leaderIdError}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Unique 3-digit Team Leader ID (numbers only)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              className="input-field"
              maxLength={10}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
            <input
              type="text"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="input-field"
              required
            >
              <option value="">Select Department</option>
              <option value="Operations">Operations</option>
              <option value="Collections">Collections</option>
              <option value="Management">Management</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
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
              Update Worker
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
