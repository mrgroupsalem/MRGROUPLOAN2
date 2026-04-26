'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRole, RoleProvider } from '@/components/RoleProvider'
import { UserIcon, PhoneIcon, MapPinIcon, CreditCardIcon, CalendarIcon, CurrencyDollarIcon, CalculatorIcon } from '@heroicons/react/24/outline'

interface Employee {
  id: string
  name: string
  designation: string
}

interface FormData {
  // Customer Details
  customer_name: string
  mobile_number: string
  address: string
  aadhaar_number: string
  pan_number: string
  
  // Loan Details
  loan_amount: string
  interest_rate: string
  number_of_weeks: string
  weekly_batch: string
  team_leader_id: string
  loan_purpose: string
  
  // Bank Details
  customer_bank_name: string
  account_number: string
  ifsc_code: string
  
  // Dates
  start_date: string
  end_date: string
}

// Photo upload state
interface PhotoUploadState {
  file: File | null
  preview: string | null
  uploading: boolean
  uploadedUrl: string | null
}

function NewLoanPageContent() {
  const router = useRouter()
  const { user } = useRole() // Get current user from context
  const [formData, setFormData] = useState<FormData>({
    customer_name: '',
    mobile_number: '',
    address: '',
    aadhaar_number: '',
    pan_number: '',
    loan_amount: '',
    interest_rate: '8.33',
    number_of_weeks: '15',
    weekly_batch: '',
    team_leader_id: '',
    loan_purpose: '',
    customer_bank_name: '',
    account_number: '',
    ifsc_code: '',
    start_date: '',
    end_date: ''
  })

  const [employees, setEmployees] = useState<Employee[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingMobile, setIsCheckingMobile] = useState(false)
  const [mobileExists, setMobileExists] = useState(false)
  const [existingCustomer, setExistingCustomer] = useState<any>(null)
  
  // Photo upload state
  const [photoUpload, setPhotoUpload] = useState<PhotoUploadState>({
    file: null,
    preview: null,
    uploading: false,
    uploadedUrl: null
  })

  // Helper functions for EMI calculations
  const calculateEMI = (): number => {
    const interestRate = parseFloat(formData.interest_rate || '0')
    const loanAmount = parseFloat(formData.loan_amount || '0')
    
    // Validate inputs
    if (isNaN(interestRate) || isNaN(loanAmount) || interestRate < 0 || loanAmount <= 0) {
      return 0
    }
    
    // EMI = (Interest Rate × Loan Amount) / 100
    return (interestRate * loanAmount) / 100
  }

  const calculateTotalPayable = (): number => {
    const emi = calculateEMI()
    const numberOfWeeks = parseInt(formData.number_of_weeks || '1')
    
    // Validate inputs
    if (isNaN(numberOfWeeks) || numberOfWeeks <= 0) {
      return 0
    }
    
    // Total Amount = EMI × Number of Weeks
    return emi * numberOfWeeks
  }

  const calculateWeeklyEMI = (): number => {
    const emi = calculateEMI()
    
    // Weekly EMI = Total Interest (EMI) - they are the same
    return emi
  }

  const calculateWeeklyPayment = (): number => {
    const totalPayable = calculateTotalPayable()
    const numberOfWeeks = parseInt(formData.number_of_weeks || '1')
    
    // Validate inputs
    if (isNaN(numberOfWeeks) || numberOfWeeks <= 0) {
      return 0
    }
    
    // Weekly Payment = Total Payable / Number of Weeks
    return totalPayable / numberOfWeeks
  }

  // Helper function to format currency with proper rounding
  const formatCurrency = (amount: number): number => {
    if (isNaN(amount) || amount < 0) return 0
    return Math.round(amount * 100) / 100 // Round to 2 decimal places
  }

  const weeklyBatches = [
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' }
  ]

  const loanPurposes = [
    'Business',
    'Personal',
    'Medical Emergency',
    'Education',
    'Home Improvement',
    'Vehicle Purchase',
    'Wedding',
    'Other'
  ]

  useEffect(() => {
    fetchEmployees()
    setDefaultDates()
  }, [])

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, designation')
        .order('name')

      if (error) {
        console.error('Error fetching employees:', error)
        return
      }

      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const setDefaultDates = () => {
    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + (15 * 7)) // 15 weeks from today

    setFormData(prev => ({
      ...prev,
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    }))
  }

  const checkExistingCustomer = async (mobile: string) => {
    if (!mobile || mobile.length < 10) {
      setMobileExists(false)
      setExistingCustomer(null)
      return
    }

    setIsCheckingMobile(true)
    try {
      // Only check customers created by the current user
      let query = supabase
        .from('customers')
        .select('*')
        .eq('phone', mobile);

      // If user is authenticated, filter by created_by
      if (user?.id) {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query.single();

      if (data) {
        setMobileExists(true)
        setExistingCustomer(data)
        // Pre-fill form with existing customer data
        setFormData(prev => ({
          ...prev,
          customer_name: data.name,
          address: data.address,
          aadhaar_number: data.aadhaar_number || '',
          pan_number: data.pan_number || ''
        }))
      } else {
        setMobileExists(false)
        setExistingCustomer(null)
      }
    } catch (error) {
      setMobileExists(false)
      setExistingCustomer(null)
    } finally {
      setIsCheckingMobile(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Check existing customer when mobile number changes
    if (field === 'mobile_number') {
      checkExistingCustomer(value)
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
      const fileExt = photoUpload.file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
      const finalExt = validExtensions.includes(fileExt) ? fileExt : 'jpg'
      const fileName = `customer-photos/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${finalExt}`
      
      console.log('📸 Starting photo upload...')
      console.log('Bucket:', 'MRGroups')
      console.log('File name:', fileName)
      console.log('File size:', (photoUpload.file!.size / 1024).toFixed(2), 'KB')
      console.log('File type:', photoUpload.file!.type)
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('MRGroups')
        .upload(fileName, photoUpload.file!, {
          cacheControl: '3600',
          upsert: false,
          contentType: photoUpload.file!.type
        })

      console.log('Upload result:', { uploadData, uploadError })

      if (uploadError) {
        console.error('❌ Upload error details:', uploadError)
        console.error('Full error object:', JSON.stringify(uploadError, null, 2))
        throw uploadError
      }

      console.log('✅ File uploaded to bucket successfully!')
      
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
      console.error('Error stack:', error?.stack)
      setPhotoUpload(prev => ({ ...prev, uploading: false }))
      
      // Show detailed error message
      let errorMsg = error?.message || error?.error_description || 'Unknown error'
      
      if (typeof errorMsg === 'string' && errorMsg.includes('Bucket not found')) {
        alert(`❌ BUCKET NOT FOUND!\n\nBucket name: MRGroups\n\nPlease check in Supabase Dashboard:\n1. Go to Storage section\n2. Verify bucket "MRGroups" exists\n3. Check exact spelling (case-sensitive)\n4. Bucket must be PUBLIC`)
      } else if (typeof errorMsg === 'string' && errorMsg.includes('row-level security')) {
        alert(`❌ PERMISSION ERROR!\n\nRow-Level Security policy is blocking the upload.\n\nRun this SQL in Supabase SQL Editor:\nSee: fix_photo_upload_complete.sql\n\nOr go to: Authentication → Policies → storage.objects`)
      } else if (typeof errorMsg === 'string' && errorMsg.includes('Unauthorized')) {
        alert(`❌ UNAUTHORIZED!\n\nYou need permission to upload to this bucket.\n\nCheck RLS policies in Supabase.`)
      } else if (typeof errorMsg === 'string' && errorMsg.includes('The resource already exists')) {
        alert(`❌ FILE ALREADY EXISTS!\n\nPlease try uploading again with a different file.`)
      } else {
        alert(`❌ Upload Failed: ${errorMsg}\n\nCheck browser console (F12) for technical details.`)
      }
      
      return null
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Required fields validation
    if (!formData.customer_name.trim()) newErrors.customer_name = 'Customer name is required'
    if (!formData.mobile_number.trim()) newErrors.mobile_number = 'Mobile number is required'
    if (!formData.address.trim()) newErrors.address = 'Address is required'
    if (!formData.loan_amount.trim()) newErrors.loan_amount = 'Loan amount is required'
    if (!formData.team_leader_id) newErrors.team_leader_id = 'Team leader is required'
    if (!formData.weekly_batch) newErrors.weekly_batch = 'Weekly batch is required'
    if (!formData.start_date) newErrors.start_date = 'Start date is required'
    if (!formData.end_date) newErrors.end_date = 'End date is required'

    // Format validation
    if (formData.mobile_number && !/^\d{10}$/.test(formData.mobile_number)) {
      newErrors.mobile_number = 'Please enter a valid 10-digit mobile number'
    }

    if (formData.aadhaar_number && !/^\d{12}$/.test(formData.aadhaar_number)) {
      newErrors.aadhaar_number = 'Please enter a valid 12-digit Aadhaar number'
    }

    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toUpperCase())) {
      newErrors.pan_number = 'Please enter a valid PAN number'
    }

    if (formData.loan_amount && (isNaN(Number(formData.loan_amount)) || Number(formData.loan_amount) <= 0)) {
      newErrors.loan_amount = 'Please enter a valid loan amount'
    }

    if (formData.account_number && !/^\d{9,18}$/.test(formData.account_number)) {
      newErrors.account_number = 'Please enter a valid account number'
    }

    if (formData.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.toUpperCase())) {
      newErrors.ifsc_code = 'Please enter a valid IFSC code'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent multiple submissions
    if (isSubmitting) {
      return
    }
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
     console.log('Starting loan creation...')
     console.log('Form data:', {
        customer_name: formData.customer_name,
        mobile_number: formData.mobile_number,
        loan_amount: formData.loan_amount,
        team_leader_id: formData.team_leader_id
      })

      // Upload photo first if exists
      let customerPhotoUrl = photoUpload.uploadedUrl
      
      if (photoUpload.file && !customerPhotoUrl) {
        console.log('📸 Initiating photo upload...')
        console.log('File details:', {
          name: photoUpload.file.name,
          size: photoUpload.file.size,
          type: photoUpload.file.type
        })
        customerPhotoUrl = await uploadPhoto()
        console.log('Upload result:', { customerPhotoUrl })
      }

      // Create or update customer first
     console.log('Creating customer...')
      console.log('Customer data includes photo_url:', !!customerPhotoUrl)
      console.log('Photo URL:', customerPhotoUrl)
      
      // First check if customer exists (created by current user)
      let customerQuery = supabase
        .from('customers')
        .select('id')
        .eq('phone', formData.mobile_number)
        .limit(1);

      // Filter by current user if authenticated
      if (user?.id) {
        customerQuery = customerQuery.eq('created_by', user.id);
      }

     const { data: existingCustomers, error: checkError } = await customerQuery;

      let customerId: string

      if (existingCustomers && existingCustomers.length > 0) {
        // Customer exists, use their ID
        customerId = existingCustomers[0].id
       console.log('Existing customer found with ID:', customerId)
        
        // Update customer details including photo URL
       const customerUpdateData: any = {
          name: formData.customer_name,
          address: formData.address,
          aadhaar_number: formData.aadhaar_number || null,
          pan_number: formData.pan_number || null
        };
        
        // Add photo URL if uploaded
        if (customerPhotoUrl) {
          customerUpdateData.photo_url = customerPhotoUrl;
        }
        
       const { error: updateError } = await supabase
          .from('customers')
          .update(customerUpdateData)
          .eq('id', customerId)

        if (updateError) {
         console.error('Error updating customer:', updateError)
        }
      } else {
        // Create new customer with created_by field and photo URL
       const customerData: any = {
          name: formData.customer_name,
          phone: formData.mobile_number,
          customer_id_display: formData.mobile_number, // Use phone as display ID
          address: formData.address,
          aadhaar_number: formData.aadhaar_number || null,
          pan_number: formData.pan_number || null
        };

        // Add photo URL if uploaded
        if (customerPhotoUrl) {
          customerData.photo_url = customerPhotoUrl;
        }

        // Add created_by field if user is authenticated
        if (user?.id) {
          customerData.created_by = user.id;
        }

       const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert(customerData)
          .select('id')
          .single()

       console.log('New customer result:', { newCustomer, customerError })

        if (customerError || !newCustomer) {
         console.error('Error creating customer:', customerError)
         const errorMsg = customerError?.message || 'Unknown error'
         const errorDetails = customerError?.details || ''
         const errorHint = customerError?.hint || ''
          alert(`Error creating customer: ${errorMsg}
${errorDetails}
${errorHint}

Please make sure database tables are set up correctly.`)
          return
        }

        customerId = newCustomer.id
       console.log('New customer created with ID:', customerId)
      }

      // Create loan with the customer UUID
     console.log('Creating loan...')
      
      // Cast status and weekly_batch to match database enums
      const loanPayload: any = {
        customer_id: customerId,
        amount: parseFloat(formData.loan_amount),
        start_date: formData.start_date,
        end_date: formData.end_date,
        interest_rate: formData.interest_rate,
        number_of_weeks: parseInt(formData.number_of_weeks),
        team_leader_id: formData.team_leader_id || null,
        weekly_batch: formData.weekly_batch || null,
        loan_purpose: formData.loan_purpose || null,
        customer_bank_name: formData.customer_bank_name || null,
        account_number: formData.account_number || null,
        ifsc_code: formData.ifsc_code || null,
        status: 'active'  // This must match loan_status enum: 'active', 'closed', or 'pending'
      }

      console.log('Loan payload:', loanPayload)

      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .insert(loanPayload)
        .select()

      console.log('Loan result:', { loanData, loanError })
      
      // Log full error object for debugging
      if (loanError) {
        console.error('Full loan error object:', JSON.stringify(loanError, null, 2))
      }

      if (loanError) {
        console.error('Error creating loan:', loanError)
        const errorMsg = loanError.message || 'Unknown error'
        const errorDetails = loanError.details || ''
        const errorHint = loanError.hint || ''
        alert(`Error creating loan: ${errorMsg}
${errorDetails}
${errorHint}

Please check:
1. Database tables exist
2. RLS policies are disabled or configured
3. All required fields are provided`)
        return
      }

      // Success
      console.log('Loan created successfully!', loanData)
      
      // Show success message first
      alert('Loan created successfully!')
      
      // Navigate to dashboard
      router.push('/')
      
    } catch (error: any) {
      console.error('Error submitting form:', error)
      alert(`An unexpected error occurred: ${error?.message || 'Unknown error'}\n\nPlease check the browser console for more details.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Stepper */}
        <div className="mb-6">
          <ol className="flex items-center w-full text-sm text-gray-600">
            <li className="flex-1 flex items-center">
              <span className="flex items-center">
                <span className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2">1</span>
                <span className="font-medium text-gray-900">Enter Details</span>
              </span>
              <span className="flex-1 h-px bg-gray-300 mx-3"></span>
            </li>
            <li className="flex items-center">
              <span className="flex items-center">
                <span className="h-6 w-6 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center mr-2">2</span>
                <span>Loan Created</span>
              </span>
            </li>
          </ol>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">New Loan Application</h1>
          <p className="text-gray-600">Fill in the details below to apply for a loan</p>
        </div>

        {/* Existing Customer Alert */}
        {mobileExists && existingCustomer && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <UserIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Existing Customer Found</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Customer: {existingCustomer.name}</p>
                  <p>Address: {existingCustomer.address}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2" />
              Customer Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.customer_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter customer name"
                />
                {errors.customer_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.customer_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.mobile_number}
                    onChange={(e) => handleInputChange('mobile_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.mobile_number ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                  />
                  {isCheckingMobile && (
                    <div className="absolute right-3 top-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
                {errors.mobile_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.mobile_number}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.address ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter complete address"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhaar Number
                </label>
                <input
                  type="text"
                  value={formData.aadhaar_number}
                  onChange={(e) => handleInputChange('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.aadhaar_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter 12-digit Aadhaar number"
                  maxLength={12}
                />
                {errors.aadhaar_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.aadhaar_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={formData.pan_number}
                  onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.pan_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter PAN number"
                  maxLength={10}
                />
                {errors.pan_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.pan_number}</p>
                )}
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
                      onClick={() => document.getElementById('photo-upload-input')?.click()}
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
                      id="photo-upload-input"
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

          {/* Loan Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 mr-2" />
              Loan Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loan Amount *
                </label>
                <input
                  type="number"
                  value={formData.loan_amount}
                  onChange={(e) => handleInputChange('loan_amount', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.loan_amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter loan amount"
                  min="1000"
                  step="100"
                />
                {errors.loan_amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.loan_amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interest Rate (% per annum)
                </label>
                <input
                  type="number"
                  value={formData.interest_rate}
                  onChange={(e) => handleInputChange('interest_rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="8.33"
                  step="0.01"
                  min="0"
                  max="50"
                />
                
                {/* Live EMI Preview */}
                {formData.interest_rate && formData.loan_amount && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <span className="font-semibold">EMI Preview:</span> ₹{formatCurrency(calculateEMI()).toLocaleString()}
                    </p>
                    {formData.number_of_weeks && (
                      <p className="text-sm text-blue-700 mt-1">
                        <span className="font-semibold">Weekly EMI:</span> ₹{formatCurrency(calculateWeeklyEMI()).toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-blue-600 mt-1">
                      Formula: (Interest Rate × Loan Amount) ÷ 100
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Weeks
                </label>
                <input
                  type="number"
                  value={formData.number_of_weeks}
                  onChange={(e) => handleInputChange('number_of_weeks', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="15"
                  min="1"
                  max="52"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weekly Batch *
                </label>
                <select
                  value={formData.weekly_batch}
                  onChange={(e) => handleInputChange('weekly_batch', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.weekly_batch ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select collection day</option>
                  {weeklyBatches.map((batch) => (
                    <option key={batch.value} value={batch.value}>
                      {batch.label}
                    </option>
                  ))}
                </select>
                {errors.weekly_batch && (
                  <p className="mt-1 text-sm text-red-600">{errors.weekly_batch}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Leader *
                </label>
                <select
                  value={formData.team_leader_id}
                  onChange={(e) => handleInputChange('team_leader_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.team_leader_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select team leader</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.designation}
                    </option>
                  ))}
                </select>
                {errors.team_leader_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.team_leader_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loan Purpose
                </label>
                <select
                  value={formData.loan_purpose}
                  onChange={(e) => handleInputChange('loan_purpose', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select loan purpose</option>
                  {loanPurposes.map((purpose) => (
                    <option key={purpose} value={purpose}>
                      {purpose}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bank Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CreditCardIcon className="h-5 w-5 mr-2" />
              Bank Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.customer_bank_name}
                  onChange={(e) => handleInputChange('customer_bank_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter bank name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => handleInputChange('account_number', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.account_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter account number"
                />
                {errors.account_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.account_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={formData.ifsc_code}
                  onChange={(e) => handleInputChange('ifsc_code', e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.ifsc_code ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter IFSC code"
                  maxLength={11}
                />
                {errors.ifsc_code && (
                  <p className="mt-1 text-sm text-red-600">{errors.ifsc_code}</p>
                )}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Important Dates
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.start_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.start_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.end_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.end_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
                )}
              </div>
            </div>
          </div>

          {/* Loan Calculation Summary */}
          {formData.loan_amount && formData.interest_rate && formData.number_of_weeks && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CalculatorIcon className="h-5 w-5 mr-2" />
                Loan Calculation Summary
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Loan Amount</p>
                  <p className="text-2xl font-bold text-blue-900">₹{parseFloat(formData.loan_amount || '0').toLocaleString()}</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Interest Rate</p>
                  <p className="text-2xl font-bold text-green-900">{formData.interest_rate}%</p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Total Interest</p>
                  <p className="text-2xl font-bold text-purple-900">₹{formatCurrency(calculateEMI()).toLocaleString()}</p>
                  <p className="text-xs text-purple-500 mt-1">(Interest Rate × Loan Amount) ÷ 100</p>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Weekly EMI</p>
                  <p className="text-2xl font-bold text-orange-900">₹{formatCurrency(calculateWeeklyEMI()).toLocaleString()}</p>
                  <p className="text-xs text-orange-500 mt-1">Same as Total Interest</p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">₹{formatCurrency(calculateTotalPayable()).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">EMI × {formData.number_of_weeks} weeks</p>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Weekly Payment</p>
                  <p className="text-2xl font-bold text-red-900">₹{formatCurrency(calculateWeeklyPayment()).toLocaleString()}</p>
                  <p className="text-xs text-red-500 mt-1">Total Amount ÷ {formData.number_of_weeks} weeks</p>
                </div>
                
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-600 font-medium">Duration</p>
                  <p className="text-2xl font-bold text-indigo-900">{formData.number_of_weeks} weeks</p>
                  <p className="text-xs text-indigo-500 mt-1">Payment period</p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">Formula:</span> EMI = (Interest Rate × Loan Amount) ÷ 100
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Total Interest = EMI | Weekly EMI = Total Interest (same value) | Total Amount = EMI × Number of Weeks | Weekly Payment = Total Amount ÷ Number of Weeks
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Loan...' : 'Create Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewLoanPage() {
  return (
    <RoleProvider>
      <NewLoanPageContent />
    </RoleProvider>
  )
}
