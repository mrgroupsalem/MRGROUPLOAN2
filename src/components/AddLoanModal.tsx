'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loan, Customer, Employee } from '@/types'

interface AddLoanModalProps {
  customers: Customer[]
  employees: Employee[]
  onClose: () => void
  onSave: (loan: Loan) => void
}

export default function AddLoanModal({ customers, employees, onClose, onSave }: AddLoanModalProps) {
  const [formData, setFormData] = useState({
    // Customer Details
    customer_id_display: '',
    customer_name: '',
    relationship: '',
    mobile_number: '',
    aadhaar_number: '',
    pan_number: '',
    address: '',
    additional_mobile_1: '',
    additional_mobile_1_relationship: '',
    additional_mobile_2: '',
    additional_mobile_2_relationship: '',
    
    // Loan Details
    amount: '',
    status: 'pending',
    start_date: '',
    end_date: '',
    interest_rate: '',
    number_of_weeks: '',
    team_leader_id: '',
    weekly_batch: '',
    loan_purpose: '',
    number_of_members: '',
    
    // Bank Details
    customer_bank_name: '',
    account_number: '',
    ifsc_code: ''
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)
  const [duplicateCustomers, setDuplicateCustomers] = useState<{name: string, phone?: string, aadhaar?: string, account_number?: string, ifsc_code?: string}[]>([])

  // Photo upload state
  const [photoUpload, setPhotoUpload] = useState<{
    file: File | null
    preview: string | null
    uploading: boolean
    uploadedUrl: string | null
  }>({
    file: null,
    preview: null,
    uploading: false,
    uploadedUrl: null
  })

  // Format Aadhaar: 0000-0000-0000
  const formatAadhaar = (value: string) => {
   const digits = value.replace(/\D/g, '')
    if (digits.length <= 4) return digits
    if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`
  }

  // Check existing customer by mobile
  const checkExistingCustomer = async (mobile: string) => {
    if (!mobile || mobile.length < 10) {
      setExistingCustomer(null)
      return
    }
    
    try {
     const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', mobile)
        .single()
      
      if (data) {
        setExistingCustomer(data)
      } else {
        setExistingCustomer(null)
      }
    } catch (error) {
      setExistingCustomer(null)
    }
  }

  // Check for duplicate customers across multiple fields
  const checkDuplicateCustomers = async () => {
  const duplicates: {name: string, phone?: string, aadhaar?: string, account_number?: string, ifsc_code?: string}[] = []
    
    try {
      // Check by mobile number
      if (formData.mobile_number && formData.mobile_number.length === 10) {
      const { data: mobileDuplicates } = await supabase
          .from('customers')
          .select('name, phone, aadhaar_number')
          .eq('phone', formData.mobile_number)
        
        if (mobileDuplicates && mobileDuplicates.length > 0) {
          duplicates.push(...mobileDuplicates.map(c => ({
            name: c.name,
            phone: c.phone,
            aadhaar: c.aadhaar_number
          })))
        }
      }
      
      // Check by Aadhaar number (without dashes)
      if (formData.aadhaar_number && formData.aadhaar_number.replace(/-/g, '').length === 12) {
     const aadhaarClean = formData.aadhaar_number.replace(/-/g, '')
     const { data: aadhaarDuplicates } = await supabase
          .from('customers')
          .select('name, phone, aadhaar_number')
          .eq('aadhaar_number', aadhaarClean)
        
        if (aadhaarDuplicates && aadhaarDuplicates.length > 0) {
          duplicates.push(...aadhaarDuplicates.map(c => ({
            name: c.name,
            phone: c.phone,
            aadhaar: c.aadhaar_number
          })))
        }
      }
      
      // Check by account number in LOANS table
      if (formData.account_number && formData.account_number.trim().length > 0) {
     const { data: accountDuplicates } = await supabase
          .from('loans')
          .select(`
            *,
            customer:customers(name, phone)
          `)
          .eq('account_number', formData.account_number.trim())
        
        if (accountDuplicates && accountDuplicates.length > 0) {
          duplicates.push(...accountDuplicates.map((loan: any) => ({
            name: loan.customer?.name || 'Unknown',
            phone: loan.customer?.phone,
            account_number: loan.account_number
          })))
        }
      }
      
      // Check by IFSC code in LOANS table
      if (formData.ifsc_code && formData.ifsc_code.trim().length > 0) {
     const { data: ifscDuplicates } = await supabase
          .from('loans')
          .select(`
            *,
            customer:customers(name, phone)
          `)
          .eq('ifsc_code', formData.ifsc_code.trim().toUpperCase())
        
        if (ifscDuplicates && ifscDuplicates.length > 0) {
          duplicates.push(...ifscDuplicates.map((loan: any) => ({
            name: loan.customer?.name || 'Unknown',
            phone: loan.customer?.phone,
            ifsc_code: loan.ifsc_code
          })))
        }
      }
      
      setDuplicateCustomers(duplicates)
      return duplicates.length > 0
    } catch (error) {
    console.error('Error checking duplicates:', error)
      setDuplicateCustomers([])
      return false
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    
    // Format Aadhaar
    if (field === 'aadhaar_number') {
      setFormData(prev => ({ ...prev, aadhaar_number: formatAadhaar(value) }))
    }
    
    // Check existing customer
    if (field === 'mobile_number') {
      checkExistingCustomer(value)
    }
    
    // Auto-calculate interest rate and end date based on weeks
    if (field === 'number_of_weeks') {
     const weeks = parseInt(value) || 0
      let rate = ''
      
      if (weeks === 15) {
        rate = '8.33'
      } else if (weeks === 20) {
        rate = '6.33'
      }
      
      setFormData(prev => ({ ...prev, interest_rate: rate }))
      
      // Also calculate end date if start date exists
      if (formData.start_date && weeks > 0) {
       const startDate = new Date(formData.start_date)
        startDate.setDate(startDate.getDate() + (weeks * 7))
       const endDateStr = startDate.toISOString().split('T')[0]
        setFormData(prev => ({ ...prev, end_date: endDateStr }))
      }
    }
    
    // Auto-calculate end date when start date changes
    if (field === 'start_date' && formData.number_of_weeks) {
     const weeks = parseInt(formData.number_of_weeks) || 0
      if (weeks > 0) {
       const startDate = new Date(value)
        startDate.setDate(startDate.getDate() + (weeks * 7))
       const endDateStr = startDate.toISOString().split('T')[0]
        setFormData(prev => ({ ...prev, end_date: endDateStr }))
      }
    }
  }

  // Handle photo file selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB')
      return
    }

    // Create preview
    const preview = URL.createObjectURL(file)
    
    setPhotoUpload({
      file,
      preview,
      uploading: false,
      uploadedUrl: null
    })
  }

  // Upload photo to Supabase Storage
  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoUpload.file) return null

    setPhotoUpload(prev => ({ ...prev, uploading: true }))

    try {
      // Generate unique file name with folder structure
      const fileExt = photoUpload.file.name.split('.').pop()
      const fileName = `customer-photos/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      
      console.log('📸 Starting photo upload...')
      console.log('Bucket:', 'MRGroups')
      console.log('File name:', fileName)
      console.log('File size:', (photoUpload.file.size / 1024).toFixed(2), 'KB')
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('MRGroups')
        .upload(fileName, photoUpload.file, {
          cacheControl: '3600',
          upsert: false
        })

      console.log('Upload result:', { uploadData, uploadError })

      if (uploadError) {
        console.error('❌ Upload error details:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('MRGroups')
        .getPublicUrl(fileName)

      console.log('✅ Photo uploaded successfully:', urlData.publicUrl)
      
      setPhotoUpload(prev => ({
        ...prev,
        uploading: false,
        uploadedUrl: urlData.publicUrl
      }))

      return urlData.publicUrl
    } catch (error: any) {
      console.error('❌ Error uploading photo:', error)
      setPhotoUpload(prev => ({ ...prev, uploading: false }))
      
      // Show detailed error message
      let errorMsg = error.message || 'Unknown error'
      
      if (errorMsg.includes('Bucket not found')) {
        alert(`❌ BUCKET NOT FOUND!\n\nBucket name: MRGroups\n\nPlease check in Supabase Dashboard:\n1. Go to Storage section\n2. Verify bucket "MRGroups" exists\n3. Check exact spelling (case-sensitive)\n4. Bucket must be PUBLIC`)
      } else if (errorMsg.includes('Unauthorized')) {
        alert(`❌ UNAUTHORIZED!\n\nYou need permission to upload to this bucket.\n\nCheck RLS policies in Supabase.`)
      } else {
        alert(`❌ Upload Failed: ${errorMsg}\n\nCheck browser console (F12) for technical details.`)
      }
      
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // First check for empty fields
  const emptyFields: string[] = []
    if (!formData.customer_id_display) emptyFields.push('Customer ID')
    if (!formData.customer_name) emptyFields.push('Customer Name')
    if (!formData.mobile_number) emptyFields.push('Mobile Number')
    if (!formData.address) emptyFields.push('Address')
    if (!formData.amount) emptyFields.push('Loan Amount')
    if (!formData.team_leader_id) emptyFields.push('Team Leader')
    if (!formData.weekly_batch) emptyFields.push('Weekly Batch')
    if (!formData.start_date) emptyFields.push('Start Date')
    if (!formData.end_date) emptyFields.push('End Date')
    if (!formData.loan_purpose) emptyFields.push('Loan Purpose')
    if (!formData.number_of_weeks) emptyFields.push('Number of Weeks')
    
    if (emptyFields.length > 0) {
   alert(`⚠️ Please fill in all required fields!\n\nMissing fields:\n- ${emptyFields.join('\n- ')}\n\nPlease check the details and complete the form.`)
      setIsSubmitting(false)
      return
    }
    
    setIsSubmitting(true)
    
    // Check for duplicates before submitting - check ALL fields
   const hasDuplicates = await checkDuplicateCustomers()
    
    // Show duplicate warning if found and BLOCK submission
    if (hasDuplicates && duplicateCustomers.length > 0) {
      // Remove duplicates from names array using filter
     const uniqueNames = duplicateCustomers.filter((c, index, self) => 
        index === self.findIndex((t) => t.name === c.name)
      ).map(c => c.name)
     const duplicateNames = uniqueNames.join(', ')
      
      // Build detailed message showing which fields matched
     const matchDetails = []
     const mobileMatch = duplicateCustomers.find(c => c.phone === formData.mobile_number)
      if (mobileMatch) matchDetails.push('Mobile Number')
      
     const aadhaarMatch = duplicateCustomers.find(c => c.aadhaar === formData.aadhaar_number?.replace(/-/g, ''))
      if (aadhaarMatch) matchDetails.push('Aadhaar Number')
      
     const accountMatch = duplicateCustomers.find(c => c.account_number === formData.account_number)
      if (accountMatch) matchDetails.push('Account Number')
      
     const ifscMatch = duplicateCustomers.find(c => c.ifsc_code === formData.ifsc_code)
      if (ifscMatch) matchDetails.push('IFSC Code')
      
      alert(
        `❌ LOAN CREATION BLOCKED!\n\n` +
        `Matching customer(s) found in database:\n${duplicateNames}\n\n` +
        `The following fields match existing customers:\n• ${matchDetails.join('\n• ')}\n\n` +
        `Please use different details or contact administrator.`
      )
      
      setIsSubmitting(false)
      return false // BLOCK submission
    }
    
    // Validation (format checks only - fields already filled)
  const newErrors: Record<string, string> = {}

    // Amount validation
    if (formData.amount && (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0)) {
      newErrors.amount = 'Please enter a valid amount'
    }

    // Mobile validation
    if (formData.mobile_number && !/^\d{10}$/.test(formData.mobile_number)) {
      newErrors.mobile_number= 'Please enter a valid 10-digit mobile number'
    }

    // Aadhaar validation
    if (formData.aadhaar_number && !/^\d{4}-\d{4}-\d{4}$/.test(formData.aadhaar_number)) {
      newErrors.aadhaar_number = 'Please enter a valid Aadhaar number (0000-0000-0000)'
    }

    // PAN validation
    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toUpperCase())) {
      newErrors.pan_number= 'Please enter a valid PAN number'
    }

    setErrors(newErrors)
    
    if (Object.keys(newErrors).length > 0) {
      setIsSubmitting(false)
      return
    }

    try {
      // Upload photo first if exists
      let customerPhotoUrl = photoUpload.uploadedUrl
      if (photoUpload.file && !customerPhotoUrl) {
        customerPhotoUrl = await uploadPhoto()
      }

      let customerId: string
      
      // Create or update customer
      if (existingCustomer) {
        // Update existing customer
        const customerUpdateData: any = {
          name: formData.customer_name,
          address: formData.address,
          aadhaar_number: formData.aadhaar_number ? formData.aadhaar_number.replace(/-/g, '') : null,
          pan_number: formData.pan_number || null
        }
        
        // Add photo URL if uploaded
        if (customerPhotoUrl) {
          customerUpdateData.photo_url = customerPhotoUrl
        }
        
        const { error: updateError } = await supabase
          .from('customers')
          .update(customerUpdateData)
          .eq('id', existingCustomer.id)
        
        if (updateError) throw updateError
        customerId = existingCustomer.id
      } else {
        // Create new customer
        const customerInsertData: any = {
          customer_id_display: formData.customer_id_display,
          name: formData.customer_name,
          phone: formData.mobile_number,
          address: formData.address,
          aadhaar_number: formData.aadhaar_number ? formData.aadhaar_number.replace(/-/g, '') : null,
          pan_number: formData.pan_number || null
        }
        
        // Add photo URL if uploaded
        if (customerPhotoUrl) {
          customerInsertData.photo_url = customerPhotoUrl
        }
        
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert(customerInsertData)
          .select('id')
          .single()
        
        if (customerError || !newCustomer) throw customerError || new Error('Failed to create customer')
        customerId = newCustomer.id
      }

      // Create loan
     const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .insert({
          customer_id: customerId,
          amount: parseFloat(formData.amount),
          start_date: formData.start_date,
          end_date: formData.end_date,
          interest_rate: String(formData.interest_rate),
          number_of_weeks: parseInt(formData.number_of_weeks),
          team_leader_id: formData.team_leader_id,
          weekly_batch: formData.weekly_batch,
          loan_purpose: formData.loan_purpose,
          customer_bank_name: formData.customer_bank_name || null,
          account_number: formData.account_number || null,
          ifsc_code: formData.ifsc_code || null,
          status: 'active'
        })
        .select()
        .single()

      if (loanError) throw loanError

      alert('Loan created successfully!')
      
      // Create Loan object for callback
     const newLoan: Loan = {
        id: loanData.id,
        customer_id: customerId,
        customer: {
          id: customerId,
          name: formData.customer_name,
          phone: formData.mobile_number,
          customer_id_display: formData.customer_id_display,
          address: formData.address,
          created_at: new Date().toISOString()
        },
        amount: parseFloat(formData.amount),
        status: 'active',
        start_date: formData.start_date,
        end_date: formData.end_date,
        interest_rate: String(formData.interest_rate),
        number_of_weeks: parseInt(formData.number_of_weeks),
        team_leader_id: formData.team_leader_id,
        weekly_batch: formData.weekly_batch as 'tuesday' | 'thursday' | 'friday',
        loan_purpose: formData.loan_purpose,
        customer_bank_name: formData.customer_bank_name || undefined,
        account_number: formData.account_number || undefined,
        ifsc_code: formData.ifsc_code || undefined,
        created_at: new Date().toISOString()
      }
      
     onSave(newLoan)
     onClose()
    } catch (error: any) {
     console.error('Error creating loan:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const relationships = [
    'Husband', 'Wife', 'Mother', 'Father', 'Daughter', 'Son', 'Brother', 'Sister', 'Other'
  ]

  const banks = [
    'State Bank of India',
    'Indian Bank',
    'Indian Overseas Bank',
    'Canara Bank',
    'Punjab National Bank',
    'Bank of Baroda',
    'Union Bank of India',
    'UCO Bank',
    'Bank of India',
    'Central Bank of India',
    'HDFC Bank',
    'Gramavidiyal Bank',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'Yes Bank',
    'IndusInd Bank',
    'Federal Bank',
    'South Indian Bank',
    'City Union Bank',
    'Karur Vysya Bank',
    'Lakshmi Vilas Bank',
    'Tamilnad Mercantile Bank',
    'Indian Bank (Madurai)',
    'Pandyan Mercantile Co-operative Bank',
    'Shri Mahila Sewa Sahakari Bank',
    'Bharatiya Mahila Bank',
    'DCB Bank',
    'IDFC First Bank',
    'Bandhan Bank',
    'Ujjivan Small Finance Bank',
    'Equitas Small Finance Bank',
    'AU Small Finance Bank',
    'Fincare Small Finance Bank',
    'Suryoday Small Finance Bank',
    'ESAF Small Finance Bank',
    'Janata Sakthi Co-operative Bank',
    'Thiruvallur Co-operative Bank',
    'Chennai Co-operative Bank',
    'Tamil Nadu State Apex Co-operative Bank',
    'Dindigul Co-operative Urban Bank',
    'Ernakulam District Co-operative Bank',
    'Other Bank'
  ]

 return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
        <h2 className="text-xl font-bold mb-4">New Loan Application</h2>
        
        {/* Existing Customer Alert */}
        {existingCustomer && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">✓ Existing customer found: {existingCustomer.name}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          
          {/* Customer Information Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID *</label>
                <input
         type="text"
                  value={formData.customer_id_display}
       onChange={(e) => handleInputChange('customer_id_display', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.customer_id_display ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter customer ID (e.g., CUST001)"
                />
                {errors.customer_id_display && <p className="text-red-500 text-xs mt-1">{errors.customer_id_display}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input
                 type="text"
                  value={formData.customer_name}
                 onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.customer_name ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter customer name"
                />
                {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                <select
                  value={formData.relationship}
                 onChange={(e) => handleInputChange('relationship', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select relationship</option>
                  {relationships.map(rel => (
                    <option key={rel} value={rel}>{rel}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                <input
                 type="tel"
                  value={formData.mobile_number}
                 onChange={(e) => handleInputChange('mobile_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.mobile_number ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                />
                {errors.mobile_number && <p className="text-red-500 text-xs mt-1">{errors.mobile_number}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                <input
                 type="text"
                  value={formData.aadhaar_number}
                 onChange={(e) => handleInputChange('aadhaar_number', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.aadhaar_number ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="0000-0000-0000"
                  maxLength={14}
                />
                {errors.aadhaar_number && <p className="text-red-500 text-xs mt-1">{errors.aadhaar_number}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                <input
                 type="text"
                  value={formData.pan_number}
                 onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.pan_number ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
                {errors.pan_number && <p className="text-red-500 text-xs mt-1">{errors.pan_number}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <textarea
                  value={formData.address}
                 onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter complete address"
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Mobile 1</label>
                <input
                 type="tel"
                  value={formData.additional_mobile_1}
                 onChange={(e) => handleInputChange('additional_mobile_1', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Mobile 1 Relationship</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Mobile 2</label>
                <input
              type="tel"
                  value={formData.additional_mobile_2}
              onChange={(e) => handleInputChange('additional_mobile_2', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Mobile 2 Relationship</label>
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

              {/* Customer Photo Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Photo
                </label>
                <div className="flex items-start space-x-4">
                  {/* Photo Preview */}
                  {photoUpload.preview && (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-300">
                      <img
                        src={photoUpload.preview}
                        alt="Customer preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Upload Button and Info */}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => document.getElementById('modal-photo-upload-input')?.click()}
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
                      id="modal-photo-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      disabled={photoUpload.uploading}
                    />
                    
                    {photoUpload.uploadedUrl && (
                      <p className="mt-2 text-sm text-green-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Photo uploaded successfully
                      </p>
                    )}
                    
                    <p className="mt-2 text-xs text-gray-500">
                      Supported formats: JPG, PNG, WEBP. Max size: 5MB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loan Information Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Loan Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                <input
            type="text"
                  value={formData.interest_rate}
           onChange={(e) => handleInputChange('interest_rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
             readOnly
                  placeholder="Auto-calculated"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated from weeks</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Weeks *</label>
                <select
               value={formData.number_of_weeks}
             onChange={(e) => handleInputChange('number_of_weeks', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.number_of_weeks ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select weeks</option>
                  <option value="15">15 Weeks (8.33%)</option>
                  <option value="20">20 Weeks (6.33%)</option>
                </select>
                {errors.number_of_weeks && <p className="text-red-500 text-xs mt-1">{errors.number_of_weeks}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Members</label>
                <input
                 type="number"
                  value={formData.number_of_members}
                 onChange={(e) => handleInputChange('number_of_members', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Leader *</label>
                <select
                  value={formData.team_leader_id}
                 onChange={(e) => handleInputChange('team_leader_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.team_leader_id ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select team leader</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} - {emp.designation}</option>
                  ))}
                </select>
                {errors.team_leader_id && <p className="text-red-500 text-xs mt-1">{errors.team_leader_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Batch *</label>
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

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Purpose *</label>
                <input
                 type="text"
                  value={formData.loan_purpose}
                 onChange={(e) => handleInputChange('loan_purpose', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.loan_purpose ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="e.g., Business expansion, Education, Medical emergency"
                />
                {errors.loan_purpose && <p className="text-red-500 text-xs mt-1">{errors.loan_purpose}</p>}
              </div>
            </div>
          </div>

          {/* Dates Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Important Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                 type="date"
                  value={formData.start_date}
                 onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.start_date ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                 type="date"
                  value={formData.end_date}
                 onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.end_date ? 'border-red-500' : 'border-gray-300'}`}
                  readOnly
                />
                {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
                <p className="text-xs text-gray-500 mt-1">Auto-calculated from weeks</p>
              </div>
            </div>
          </div>

          {/* Bank Information Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Bank Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <select
             value={formData.customer_bank_name}
        onChange={(e) => handleInputChange('customer_bank_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select bank</option>
                  {banks.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
            type="text"
                  value={formData.account_number}
          onChange={(e) => handleInputChange('account_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter account number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                <input
            type="text"
                  value={formData.ifsc_code}
         onChange={(e) => handleInputChange('ifsc_code', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter IFSC code"
                  maxLength={11}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
             type="button"
             onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
             type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Loan...' : 'Create Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
