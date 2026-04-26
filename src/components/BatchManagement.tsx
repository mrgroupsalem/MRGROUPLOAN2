'use client'

import { useState, useEffect } from 'react'
import { Plus, Calendar, Users, Eye, Edit, Trash2, Download } from 'lucide-react'
import { Batch, BatchCustomer, Customer, Loan } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToCSV } from '@/lib/exportUtils'
import { supabase } from '@/lib/supabase'

interface BatchManagementProps {
  onBack: () => void
}

export default function BatchManagement({ onBack }: BatchManagementProps) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [batchToEdit, setBatchToEdit] = useState<Batch | null>(null)
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null)
  const [batchCustomers, setBatchCustomers] = useState<BatchCustomer[]>([])

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load batches
        const { data: batchesData, error: batchesError } = await supabase
          .from('batches')
          .select('*')
        
        if (batchesError) {
          console.error('Error loading batches:', batchesError)
        } else {
          setBatches(batchesData || [])
        }

        // Load batch customers with related data
        const { data: batchCustomersData, error: batchCustomersError } = await supabase
          .from('batch_customers')
          .select(`
            *,
            customer:customers(*),
            loan:loans(*)
          `)
        
        if (batchCustomersError) {
          console.error('Error loading batch customers:', batchCustomersError)
        } else {
          setBatchCustomers(batchCustomersData || [])
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getBatchCustomers = (batchId: string) => {
    return batchCustomers.filter(bc => bc.batch_id === batchId)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'unpaid': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDayOfWeek = (date: string) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[new Date(date).getDay()]
  }

  const handleEditBatch = (batch: Batch) => {
    setBatchToEdit(batch)
    setShowEditModal(true)
  }

  const handleDeleteBatch = (batch: Batch) => {
    setBatchToDelete(batch)
    setShowDeleteModal(true)
  }

  const confirmDeleteBatch = async () => {
    if (batchToDelete) {
      try {
        // Delete batch from Supabase
        const { error } = await supabase
          .from('batches')
          .delete()
          .eq('id', batchToDelete.id)

        if (error) {
          console.error('Error deleting batch:', error)
          alert('Error deleting batch. Please try again.')
          return
        }

        // Update local state
        setBatches(batches.filter(b => b.id !== batchToDelete.id))
        setShowDeleteModal(false)
        setBatchToDelete(null)
        alert('Batch deleted successfully!')
      } catch (error) {
        console.error('Error deleting batch:', error)
        alert('Error deleting batch. Please try again.')
      }
    }
  }

  const handleUpdateBatch = async (updatedBatch: Batch) => {
    try {
      // Update batch in Supabase
      const { data, error } = await supabase
        .from('batches')
        .update({
          name: updatedBatch.name,
          date: updatedBatch.date,
          total_collection: updatedBatch.total_collection,
          customer_count: updatedBatch.customer_count
        })
        .eq('id', updatedBatch.id)
        .select()

      if (error) {
        console.error('Error updating batch:', error)
        alert('Error updating batch. Please try again.')
        return
      }

      // Update local state
      setBatches(batches.map(b => 
        b.id === updatedBatch.id ? data[0] : b
      ))
      
      setShowEditModal(false)
      setBatchToEdit(null)
      alert('Batch updated successfully!')
    } catch (error) {
      console.error('Error updating batch:', error)
      alert('Error updating batch. Please try again.')
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 space-y-8">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/20 p-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={onBack}
              className="btn-ghost flex items-center space-x-2 hover-lift"
            >
              <span className="text-xl">←</span>
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-4xl font-bold gradient-text">Weekly Batch Management</h1>
              <p className="text-slate-600 mt-2">Manage your weekly collection batches</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                const exportData = batches.map(batch => ({
                  'Batch ID': batch.id,
                  'Batch Name': batch.name,
                  'Date': batch.date,
                  'Total Collection': batch.total_collection,
                  'Customer Count': batch.customer_count,
                  'Created Date': batch.created_at
                }))
                exportToCSV(exportData, 'batches')
              }}
              className="btn-success flex items-center space-x-2 hover-lift"
            >
              <Download className="w-5 h-5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center space-x-2 hover-lift"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Batch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-gradient hover-lift animate-slide-up">
          <div className="flex items-center">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div className="ml-6">
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Batches</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{batches.length}</p>
            </div>
          </div>
        </div>
        <div className="card-gradient hover-lift animate-slide-up" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center">
            <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div className="ml-6">
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Customers</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {batches.reduce((sum, batch) => sum + batch.customer_count, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="card-gradient hover-lift animate-slide-up" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center">
            <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
              <span className="text-2xl font-bold text-white">₹</span>
            </div>
            <div className="ml-6">
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Collection</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {formatCurrency(batches.reduce((sum, batch) => sum + batch.total_collection, 0))}
              </p>
            </div>
          </div>
        </div>
        <div className="card-gradient hover-lift animate-slide-up" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div className="ml-6">
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">This Week</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {batches.filter(batch => {
                  const batchDate = new Date(batch.date)
                  const now = new Date()
                  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                  return batchDate >= weekAgo
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map((batch, index) => (
          <div key={batch.id} className="card-gradient hover-lift animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{batch.name}</h3>
                <p className="text-slate-600 flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{getDayOfWeek(batch.date)} • {formatDate(batch.date)}</span>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedBatch(batch)}
                  className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100/80 transition-all duration-300 hover:scale-105"
                  title="View Details"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleEditBatch(batch)}
                  className="p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-100/80 transition-all duration-300 hover:scale-105"
                  title="Edit Batch"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDeleteBatch(batch)}
                  className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-100/80 transition-all duration-300 hover:scale-105"
                  title="Delete Batch"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl">
                <span className="text-sm font-semibold text-slate-600">Total Collection</span>
                <span className="text-xl font-bold text-slate-900">
                  {formatCurrency(batch.total_collection)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl">
                <span className="text-sm font-semibold text-slate-600">Customer Count</span>
                <span className="text-lg font-bold text-slate-900">
                  {batch.customer_count} customers
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl">
                <span className="text-sm font-semibold text-slate-600">Average per Customer</span>
                <span className="text-lg font-bold text-slate-900">
                  {batch.customer_count > 0 
                    ? formatCurrency(batch.total_collection / batch.customer_count)
                    : formatCurrency(0)
                  }
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/50">
              <button
                onClick={() => setSelectedBatch(batch)}
                className="w-full btn-primary text-center hover-lift"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Batch Modal */}
      {showAddModal && (
        <AddBatchModal
          onClose={() => setShowAddModal(false)}
          onSave={(batch) => {
            setBatches([...batches, batch])
            setShowAddModal(false)
          }}
        />
      )}

      {/* Batch Details Modal */}
      {selectedBatch && (
        <BatchDetailsModal
          batch={selectedBatch}
          customers={getBatchCustomers(selectedBatch.id)}
          onClose={() => setSelectedBatch(null)}
        />
      )}

      {/* Edit Batch Modal */}
      {showEditModal && batchToEdit && (
        <EditBatchModal
          batch={batchToEdit}
          onClose={() => {
            setShowEditModal(false)
            setBatchToEdit(null)
          }}
          onSave={handleUpdateBatch}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && batchToDelete && (
        <DeleteConfirmationModal
          itemName="batch"
          itemDetails={`${batchToDelete.name} (${formatDate(batchToDelete.date)})`}
          onClose={() => {
            setShowDeleteModal(false)
            setBatchToDelete(null)
          }}
          onConfirm={confirmDeleteBatch}
        />
      )}
    </div>
  )
}

// Add Batch Modal Component
function AddBatchModal({ 
  onClose, 
  onSave 
}: { 
  onClose: () => void
  onSave: (batch: Batch) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    date: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newBatch: Batch = {
      id: Date.now().toString(),
      name: formData.name,
      date: formData.date,
      total_collection: 0,
      customer_count: 0,
      created_at: new Date().toISOString()
    }
    onSave(newBatch)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Create New Batch</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="e.g., Tuesday Batch - Week 1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="input-field"
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
              Create Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Batch Details Modal Component
function BatchDetailsModal({ 
  batch, 
  customers, 
  onClose 
}: { 
  batch: Batch
  customers: BatchCustomer[]
  onClose: () => void
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'unpaid': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">{batch.name}</h2>
            <p className="text-sm text-gray-500">{formatDate(batch.date)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Batch Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(batch.total_collection)}
              </p>
              <p className="text-sm text-gray-600">Total Collection</p>
            </div>
          </div>
          <div className="card">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{batch.customer_count}</p>
              <p className="text-sm text-gray-600">Customers</p>
            </div>
          </div>
          <div className="card">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {batch.customer_count > 0 
                  ? formatCurrency(batch.total_collection / batch.customer_count)
                  : formatCurrency(0)
                }
              </p>
              <p className="text-sm text-gray-600">Average per Customer</p>
            </div>
          </div>
        </div>

        {/* Customer Details Table */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Customer Details</h3>
          {customers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loan Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount Paid
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.filter(bc => bc.customer).map((bc) => (
                    <tr key={bc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {bc.customer?.name || 'Customer Deleted'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {bc.customer?.phone || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(bc.loan?.amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(bc.amount_paid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(bc.balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bc.status)}`}>
                          {bc.status.charAt(0).toUpperCase() + bc.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No customers added to this batch yet.
            </p>
          )}
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

// Edit Batch Modal Component
function EditBatchModal({ 
  batch, 
  onClose, 
  onSave 
}: { 
  batch: Batch
  onClose: () => void
  onSave: (batch: Batch) => void
}) {
  const [formData, setFormData] = useState({
    name: batch.name,
    date: batch.date,
    total_collection: batch.total_collection.toString(),
    customer_count: batch.customer_count.toString()
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const updatedBatch: Batch = {
      ...batch,
      name: formData.name,
      date: formData.date,
      total_collection: parseFloat(formData.total_collection),
      customer_count: parseInt(formData.customer_count)
    }
    onSave(updatedBatch)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Edit Batch</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch Name
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
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Collection (₹)
            </label>
            <input
              type="number"
              value={formData.total_collection}
              onChange={(e) => setFormData({ ...formData, total_collection: e.target.value })}
              className="input-field"
              required
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Count
            </label>
            <input
              type="number"
              value={formData.customer_count}
              onChange={(e) => setFormData({ ...formData, customer_count: e.target.value })}
              className="input-field"
              required
              min="0"
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
              Update Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Delete Confirmation Modal Component (reusable)
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
