'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Flame, User, Calendar, DollarSign, Users, AlertCircle, CheckCircle } from 'lucide-react'
import { Customer, Employee } from '@/types'

interface EmergencyLoanApplicationProps {
  onClose: () => void
  onSuccess?: () => void
  initialData?: {
    customer_id: string
    customer_name: string
    mobile_number: string
    relationship?: string
    aadhaar_number?: string
    pan_number?: string
    address?: string
    team_leader_id?: string
    loan_amount: string
    due_amount: string
    number_of_days: string
    start_date: string
    end_date: string
    loanId?: string
  }
}

const relationships = [
  'Husband', 'Wife', 'Mother', 'Father', 
  'Daughter', 'Son', 'Brother', 'Sister', 'Other'
]

// Emergency Loan Conditions
const getLoanLimitDays = (loanAmount: number, dueAmount: number): number => {
  if (loanAmount === 10000) {
    if (dueAmount === 100) return 10
    if (dueAmount === 200) return 7
    if (dueAmount === 300) return 5
  }
  return 10 // Default
}

export default function EmergencyLoanApplication({ onClose, onSuccess, initialData }: EmergencyLoanApplicationProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    // Customer Details
    customer_id: initialData?.customer_id || '',
    customer_name: initialData?.customer_name || '',
    relationship: initialData?.relationship || '',
    mobile_number: initialData?.mobile_number || '',
    aadhaar_number: initialData?.aadhaar_number || '',
    pan_number: initialData?.pan_number || '',
    address: initialData?.address || '',
    additional_mobile_1: '',
    additional_mobile_1_relationship: '',
    additional_mobile_2: '',
    additional_mobile_2_relationship: '',
    
    // Loan Details
    team_leader_id: initialData?.team_leader_id || '',
    loan_amount: initialData?.loan_amount || '',
    due_amount: initialData?.due_amount || '',
    number_of_days: initialData?.number_of_days || '',
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || ''
  })

  // If initialData is provided, we're in edit mode
  useEffect(() => {
    if (initialData?.loanId) {
      setEditingLoanId(initialData.loanId)
    }
  }, [initialData])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .order('name', { ascending: true })
        
        if (error) {
          console.error('Error loading employees:', error)
        } else {
          setEmployees(data || [])
        }
      } catch (error) {
        console.error('Error loading employees:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadEmployees()
  }, [])

  // Calculate number of days based on loan amount and due amount
  useEffect(() => {
    if (formData.loan_amount && formData.due_amount) {
      const loanAmount = parseFloat(formData.loan_amount)
      const dueAmount = parseFloat(formData.due_amount)
      const days = getLoanLimitDays(loanAmount, dueAmount)
      setFormData(prev => ({ ...prev, number_of_days: days.toString() }))
    }
  }, [formData.loan_amount, formData.due_amount])

  // Calculate ending date based on starting date and number of days
  useEffect(() => {
    if (formData.start_date && formData.number_of_days) {
      const startDate = new Date(formData.start_date)
      const days = parseInt(formData.number_of_days) || 0
      startDate.setDate(startDate.getDate() + days)
      
      const endDateStr = startDate.toISOString().split('T')[0]
      setFormData(prev => ({ ...prev, end_date: endDateStr }))
    }
  }, [formData.start_date, formData.number_of_days])

  // Format Aadhaar number: 0000-0000-0000
  const formatAadhaar = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 4) return digits
    if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`
  }

  // Check if customer exists
  const checkExistingCustomer = async (mobile: string) => {
    if (!mobile) return
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', mobile)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking customer:', error)
        return null
      }

      if (data) {
        setExistingCustomer(data)
        // Pre-fill customer data if exists
        setFormData(prev => ({
          ...prev,
          customer_id: data.customer_id_display || data.id,
          customer_name: data.name,
          relationship: data.relationship || '',
          aadhaar_number: data.aadhaar_number || '',
          pan_number: data.pan_number || '',
          address: data.address || '',
          additional_mobile_1: data.additional_mobile_1 || '',
          additional_mobile_1_relationship: data.additional_mobile_1_relationship || '',
          additional_mobile_2: data.additional_mobile_2 || '',
          additional_mobile_2_relationship: data.additional_mobile_2_relationship || ''
        }))
      } else {
        setExistingCustomer(null)
      }
      
      return data
    } catch (error) {
      console.error('Error checking customer:', error)
      return null
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Customer Details
    if (!formData.customer_id.trim()) {
      newErrors.customer_id = 'Customer ID is required'
    }
    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Customer Name is required'
    }
    if (!formData.mobile_number.trim()) {
      newErrors.mobile_number = 'Mobile Number is required'
    } else if (!/^\d{10}$/.test(formData.mobile_number.replace(/\D/g, ''))) {
      newErrors.mobile_number = 'Mobile Number must be 10 digits'
    }
    if (!formData.aadhaar_number.trim()) {
      newErrors.aadhaar_number = 'Aadhaar Number is required'
    } else {
      const aadhaarDigits = formData.aadhaar_number.replace(/\D/g, '')
      if (aadhaarDigits.length !== 12) {
        newErrors.aadhaar_number = 'Aadhaar Number must be 12 digits (format: 0000-0000-0000)'
      }
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    }

    // Loan Details
    if (!formData.team_leader_id) {
      newErrors.team_leader_id = 'Team Leader is required'
    }
    if (!formData.loan_amount || parseFloat(formData.loan_amount) <= 0) {
      newErrors.loan_amount = 'Loan Amount is required and must be greater than 0'
    }
    if (!formData.due_amount) {
      newErrors.due_amount = 'Due Amount is required'
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Start Date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Check if customer exists, create or update
      let customerData = await checkExistingCustomer(formData.mobile_number)

      if (!customerData) {
        // Generate customer ID if not provided
        let customerIdDisplay = formData.customer_id.trim()
        if (!customerIdDisplay) {
          // Generate new customer ID
          const { data: lastCustomer } = await supabase
            .from('customers')
            .select('customer_id_display')
            .order('created_at', { ascending: false })
            .limit(1)
          
          const lastId = lastCustomer?.[0]?.customer_id_display
          const lastNum = lastId ? parseInt(lastId.replace(/\D/g, '')) || 0 : 0
          customerIdDisplay = String(lastNum + 1).padStart(4, '0')
        }

        // Create new customer
        const customerPayload: any = {
          customer_id_display: customerIdDisplay,
          name: formData.customer_name.trim(),
          phone: formData.mobile_number.replace(/\D/g, ''),
          address: formData.address.trim(),
          relationship: formData.relationship || null,
          aadhaar_number: formData.aadhaar_number.replace(/\D/g, ''),
          pan_number: formData.pan_number.trim() || null,
          additional_mobile_1: formData.additional_mobile_1.replace(/\D/g, '') || null,
          additional_mobile_1_relationship: formData.additional_mobile_1_relationship || null,
          additional_mobile_2: formData.additional_mobile_2.replace(/\D/g, '') || null,
          additional_mobile_2_relationship: formData.additional_mobile_2_relationship || null
        }
        
        // Only add is_verified if the column exists in the database
        // Check if we can determine column existence, otherwise omit it
        // For now, we'll omit it to avoid schema cache errors

        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert(customerPayload)
          .select()
          .single()

        if (customerError) {
          console.error('Error creating customer:', customerError)
          alert(`Error creating customer: ${customerError.message}`)
          return
        }

        customerData = newCustomer
      } else {
        // Update existing customer
        const updatePayload: any = {
          name: formData.customer_name.trim(),
          phone: formData.mobile_number.replace(/\D/g, ''),
          address: formData.address.trim(),
          relationship: formData.relationship || null,
          aadhaar_number: formData.aadhaar_number.replace(/\D/g, ''),
          pan_number: formData.pan_number.trim() || null,
          additional_mobile_1: formData.additional_mobile_1.replace(/\D/g, '') || null,
          additional_mobile_1_relationship: formData.additional_mobile_1_relationship || null,
          additional_mobile_2: formData.additional_mobile_2.replace(/\D/g, '') || null,
          additional_mobile_2_relationship: formData.additional_mobile_2_relationship || null
        }

        const { error: updateError } = await supabase
          .from('customers')
          .update(updatePayload)
          .eq('id', customerData.id)

        if (updateError) {
          console.error('Error updating customer:', updateError)
          alert(`Error updating customer: ${updateError.message}`)
          return
        }
      }

      // Create or update emergency loan in emergency_loans table
      const loanPayload: any = {
        customer_id: customerData.id, // Use UUID
        customer_name: formData.customer_name.trim(),
        mobile_number: formData.mobile_number.replace(/\D/g, ''),
        address: formData.address.trim(),
        additional_mobile_1: formData.additional_mobile_1.replace(/\D/g, '') || null,
        additional_mobile_1_relationship: formData.additional_mobile_1_relationship || null,
        additional_mobile_2: formData.additional_mobile_2.replace(/\D/g, '') || null,
        additional_mobile_2_relationship: formData.additional_mobile_2_relationship || null,
        loan_amount: parseFloat(formData.loan_amount),
        due_amount: parseFloat(formData.due_amount),
        number_of_days: parseInt(formData.number_of_days),
        start_date: formData.start_date,
        end_date: formData.end_date,
        team_leader_id: formData.team_leader_id
      }

      // Don't set status on update (preserve existing status)
      if (!editingLoanId) {
        loanPayload.status = 'active'
      }

      let loanError

      if (editingLoanId) {
        // Update existing emergency loan
        const { error } = await supabase
          .from('emergency_loans')
          .update(loanPayload)
          .eq('id', editingLoanId)

        loanError = error
        if (!loanError) {
          alert('Emergency Loan updated successfully!')
        }
      } else {
        // Create new emergency loan
        const { data: loanData, error } = await supabase
          .from('emergency_loans')
          .insert(loanPayload)
          .select()
          .single()

        loanError = error
        if (!loanError) {
          alert('Emergency Loan created successfully!')
        }
      }

      if (loanError) {
        console.error(`Error ${editingLoanId ? 'updating' : 'creating'} emergency loan:`, loanError)
        alert(`Error ${editingLoanId ? 'updating' : 'creating'} emergency loan: ${loanError.message}`)
        return
      }
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err: any) {
      console.error('Error creating emergency loan:', err)
      alert('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Flame className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">{editingLoanId ? 'Edit Emergency Loan' : 'New Emergency Loan Application'}</h2>
                <p className="text-sm opacity-90">{editingLoanId ? 'Update the loan details below' : 'Fill in all the details below'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Details Section */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <User className="w-5 h-5 text-red-600" />
              <span>Customer Details</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customer_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                  placeholder="Enter Customer ID"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.customer_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.customer_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>
                )}
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  placeholder="Enter Customer Name"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.customer_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.customer_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.customer_name}</p>
                )}
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select Relationship</option>
                  {relationships.map(rel => (
                    <option key={rel} value={rel}>{rel}</option>
                  ))}
                </select>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.mobile_number}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setFormData(prev => ({ ...prev, mobile_number: value }))
                    if (value.length === 10) {
                      checkExistingCustomer(value)
                    }
                  }}
                  placeholder="10 digit mobile number"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.mobile_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.mobile_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.mobile_number}</p>
                )}
                {existingCustomer && (
                  <p className="text-blue-600 text-xs mt-1 flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Existing customer found - data pre-filled</span>
                  </p>
                )}
              </div>

              {/* Aadhaar Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aadhaar Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.aadhaar_number}
                  onChange={(e) => {
                    const formatted = formatAadhaar(e.target.value)
                    setFormData(prev => ({ ...prev, aadhaar_number: formatted }))
                  }}
                  placeholder="0000-0000-0000"
                  maxLength={14}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.aadhaar_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.aadhaar_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.aadhaar_number}</p>
                )}
              </div>

              {/* PAN Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={formData.pan_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, pan_number: e.target.value.toUpperCase() }))}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter full address"
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.address && (
                  <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                )}
              </div>

              {/* Additional Mobile 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Mobile Number 1
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={formData.additional_mobile_1}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setFormData(prev => ({ ...prev, additional_mobile_1: value }))
                    }}
                    placeholder="10 digit mobile"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <select
                    value={formData.additional_mobile_1_relationship}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_mobile_1_relationship: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Relation</option>
                    {relationships.map(rel => (
                      <option key={rel} value={rel}>{rel}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Additional Mobile 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Mobile Number 2
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={formData.additional_mobile_2}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setFormData(prev => ({ ...prev, additional_mobile_2: value }))
                    }}
                    placeholder="10 digit mobile"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <select
                    value={formData.additional_mobile_2_relationship}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_mobile_2_relationship: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Relation</option>
                    {relationships.map(rel => (
                      <option key={rel} value={rel}>{rel}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Loan Details Section */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-red-600" />
              <span>Loan Details</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team Leader */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Team Leader <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.team_leader_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, team_leader_id: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.team_leader_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Team Leader</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                {errors.team_leader_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.team_leader_id}</p>
                )}
              </div>

              {/* Loan Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.loan_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, loan_amount: e.target.value }))}
                  placeholder="Enter loan amount"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.loan_amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.loan_amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.loan_amount}</p>
                )}
              </div>

              {/* Due Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Amount <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.due_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_amount: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.due_amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Due Amount</option>
                  <option value="100">₹100</option>
                  <option value="200">₹200</option>
                  <option value="300">₹300</option>
                </select>
                {errors.due_amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.due_amount}</p>
                )}
              </div>

              {/* Number of Days (Auto-calculated) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Days <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.number_of_days}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                >
                  <option value="">Select Days</option>
                  <option value="10">10 days</option>
                  <option value="7">7 days</option>
                  <option value="5">5 days</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Auto-calculated based on loan amount and due amount</p>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.start_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.start_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>
                )}
              </div>

              {/* End Date (Auto-calculated) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated from start date and number of days</p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4" />
                  <span>{editingLoanId ? 'Update Emergency Loan' : 'Create Emergency Loan'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
