'use client'

import { Suspense } from 'react'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircleIcon, DocumentTextIcon, UserIcon, CalendarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { getLoanDisplayId } from '@/lib/loanIdGenerator'

interface LoanDetails {
  id: string
  loan_id_display?: string
  amount: number
  status: string
  start_date: string
  end_date: string
  interest_rate: string
  number_of_weeks: number
  weekly_batch: string | null
  loan_purpose: string | null
  customer: {
    id: string
    name: string
    phone: string
    address: string
  }
}

export default function LoanSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoanSuccessRoot />
    </Suspense>
  )
}

function LoanSuccessRoot() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const loanId = searchParams.get('loanId')
  
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loanId) {
      fetchLoanDetails()
    } else {
      setLoading(false)
    }
  }, [loanId])

  const fetchLoanDetails = async () => {
    try {
      const { data: loanData, error } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single()

      if (error) {
        console.error('Error fetching loan details:', error)
        setError('Failed to load loan details')
        return
      }

      // Manually join customer data
      let { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('customer_id_display', loanData.customer_id)
        .single()
      
      // If not found, try by phone
      if (!customerData) {
        const { data: customerByPhone } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', loanData.customer_id)
          .single()
        customerData = customerByPhone
      }
      
      // If still not found, create placeholder
      if (!customerData) {
        customerData = {
          id: `placeholder-${loanData.customer_id}`,
          name: `Customer ${loanData.customer_id}`,
          phone: loanData.customer_id,
          address: 'Address not available',
          customer_id_display: loanData.customer_id
        }
      }

      const loanWithCustomer = {
        ...loanData,
        customer: customerData
      }

      setLoanDetails(loanWithCustomer)
    } catch (error) {
      console.error('Error fetching loan details:', error)
      setError('Failed to load loan details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const calculateWeeklyEMI = () => {
    if (!loanDetails) return 0
    const principal = loanDetails.amount
    const rate = parseFloat(loanDetails.interest_rate) / 100
    const weeks = loanDetails.number_of_weeks
    
    // Simple interest calculation for weekly EMI
    const totalInterest = principal * rate * (weeks / 52)
    const totalAmount = principal + totalInterest
    return totalAmount / weeks
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading loan details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-md max-w-md">
            <h3 className="text-lg font-medium mb-2">Error</h3>
            <p>{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Loan Application Successful!
          </h1>
          <p className="text-lg text-gray-600">
            Your loan has been approved and processed successfully.
          </p>
        </div>

        {/* Loan Details Card */}
        {loanDetails && (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
              <h2 className="text-xl font-semibold text-blue-900 flex items-center">
                <DocumentTextIcon className="h-6 w-6 mr-2" />
                Loan Details
              </h2>
            </div>
            
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2" />
                    Customer Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Name:</span>
                      <p className="text-gray-900">{loanDetails.customer.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Phone:</span>
                      <p className="text-gray-900">{loanDetails.customer.phone}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Address:</span>
                      <p className="text-gray-900">{loanDetails.customer.address}</p>
                    </div>
                  </div>
                </div>

                {/* Loan Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                    Loan Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Loan ID:</span>
                      <p className="text-blue-900 font-mono font-bold text-base">{getLoanDisplayId(loanDetails)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Loan Amount:</span>
                      <p className="text-gray-900 text-lg font-semibold">{formatCurrency(loanDetails.amount)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Interest Rate:</span>
                      <p className="text-gray-900">{loanDetails.interest_rate}% per annum</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Duration:</span>
                      <p className="text-gray-900">{loanDetails.number_of_weeks} weeks</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Weekly EMI:</span>
                      <p className="text-gray-900 font-semibold">{formatCurrency(calculateWeeklyEMI())}</p>
                    </div>
                    {loanDetails.weekly_batch && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Collection Day:</span>
                        <p className="text-gray-900 capitalize">{loanDetails.weekly_batch}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Important Dates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Start Date:</span>
                    <p className="text-gray-900">{formatDate(loanDetails.start_date)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">End Date:</span>
                    <p className="text-gray-900">{formatDate(loanDetails.end_date)}</p>
                  </div>
                </div>
              </div>

              {/* Loan Purpose */}
              {loanDetails.loan_purpose && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Loan Purpose:</span>
                    <p className="text-gray-900">{loanDetails.loan_purpose}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => window.print()}
              className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors"
            >
              Print Details
            </button>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>You will receive SMS notifications for payment reminders.</p>
            <p>Keep this reference number: <span className="font-mono font-medium">{loanDetails?.id.slice(-8).toUpperCase()}</span></p>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">What's Next?</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Your loan is now active.</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Weekly payments will be collected as per the schedule.</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>You will receive SMS reminders before each payment due date.</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Contact our support team if you have any questions.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
