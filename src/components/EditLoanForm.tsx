'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  Save,
  AlertTriangle,
  CheckCircle2,
  Upload,
  MapPin,
  Calendar,
  Building,
  User,
  CreditCard,
  Phone,
  ShieldCheck,
  RotateCcw,
  Loader2,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react'
import { Loan, Customer, Employee } from '@/types'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PhotoLightbox from './ui/PhotoLightbox'
import { getFirstDueDate, generateDueSchedule, formatDueDate } from '@/lib/dueSchedule'

interface EditLoanFormProps {
  loan: Loan
  employees: Employee[]
  isOpen: boolean
  onClose: () => void
  onSaveSuccess: () => void
}

const POPULAR_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Indian Bank',
  'Canara Bank',
  'Axis Bank',
  'Bank of Baroda',
  'Punjab National Bank',
  'Union Bank of India',
  'Kotak Mahindra Bank',
  'Other',
]

const RELATIONSHIPS = [
  'Husband',
  'Wife',
  'Father',
  'Mother',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Other',
]

const LOAN_PURPOSES = [
  'Business Expansion',
  'Working Capital',
  'Agriculture & Farming',
  'Education',
  'Home Renovation',
  'Medical Emergency',
  'Vehicle Purchase',
  'Personal Expenses',
  'Other',
]

export default function EditLoanForm({
  loan,
  employees,
  isOpen,
  onClose,
  onSaveSuccess,
}: EditLoanFormProps) {
  const initialCustomer = loan.customer || ({} as Partial<Customer>)

  // Form State
  const [formData, setFormData] = useState({
    // A) Customer Details
    customer_id_display: initialCustomer.customer_id_display || '',
    customer_name: initialCustomer.name || '',
    name: (initialCustomer as any).relative_name || '',
    relationship: (initialCustomer as any).relationship || '',
    mobile_number: initialCustomer.phone || '',
    aadhaar_number: (initialCustomer as any).aadhaar_number || '',
    pan_number: (initialCustomer as any).pan_number || '',
    address: initialCustomer.address || '',
    latitude: String((initialCustomer as any).latitude || ''),
    longitude: String((initialCustomer as any).longitude || ''),
    additional_mobile_1: (initialCustomer as any).additional_mobile_1 || '',
    additional_mobile_1_name: (initialCustomer as any).additional_mobile_1_name || '',
    additional_mobile_1_relationship: (initialCustomer as any).additional_mobile_1_relationship || '',
    additional_mobile_2: (initialCustomer as any).additional_mobile_2 || '',
    additional_mobile_2_name: (initialCustomer as any).additional_mobile_2_name || '',
    additional_mobile_2_relationship: (initialCustomer as any).additional_mobile_2_relationship || '',

    // B) Loan Details
    amount: String(loan.amount || ''),
    interest_rate: String(loan.interest_rate || '8.33'),
    number_of_weeks: String(loan.number_of_weeks || '15'),
    number_of_members: String(loan.number_of_members || '1'),
    team_leader_id: loan.team_leader_id || '',
    weekly_batch: loan.weekly_batch || 'tuesday',
    loan_purpose: loan.loan_purpose || 'Business Expansion',

    // C) Dates
    disbursement_date: loan.disbursement_date || '',
    start_date: loan.start_date || (loan.created_at ? loan.created_at.split('T')[0] : ''),
    end_date: loan.end_date || '',

    // D) Bank Details
    customer_bank_name: loan.customer_bank_name || '',
    account_number: loan.account_number || '',
    ifsc_code: loan.ifsc_code || '',
  })

  // Track initial values to detect changed fields
  const [initialDataSnapshot] = useState({ ...formData })

  // Photo state
  const existingPhoto = (initialCustomer as any).photo_url || (initialCustomer as any).profile_photo || null
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(existingPhoto)
  const [isPhotoRemoved, setIsPhotoRemoved] = useState<boolean>(false)
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState<boolean>(false)

  // Status & Validation
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [existingPaymentsCount, setExistingPaymentsCount] = useState<number>(0)
  const [showFinancialWarning, setShowFinancialWarning] = useState<boolean>(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null)

  // WhatsApp OTP for mobile change
  const isMobileChanged = formData.mobile_number !== initialCustomer.phone
  const [otpState, setOtpState] = useState({
    sent: false,
    verified: false,
    sending: false,
    verifying: false,
    code: '',
    error: '',
    success: '',
  })

  // Check if loan has payments in database
  useEffect(() => {
    if (!loan?.id) return
    const fetchPayments = async () => {
      const { data, count } = await supabase
        .from('collections')
        .select('id, amount_collected', { count: 'exact' })
        .eq('loan_id', loan.id)

      if (count && count > 0) {
        setExistingPaymentsCount(count)
      }
    }
    fetchPayments()
  }, [loan?.id])

  // Recalculate end date and rate when weeks or start date changes
  const handleWeeksChange = (weeksStr: string) => {
    const weeks = parseInt(weeksStr) || 15
    let rate = '8.33'
    if (weeks === 20) rate = '6.33'
    else if (weeks === 25) rate = '5.25'

    let newEndDate = formData.end_date
    if (formData.start_date) {
      const sd = new Date(formData.start_date)
      sd.setDate(sd.getDate() + weeks * 7)
      newEndDate = sd.toISOString().split('T')[0]
    }

    setFormData((prev) => ({
      ...prev,
      number_of_weeks: weeksStr,
      interest_rate: rate,
      end_date: newEndDate,
    }))
  }

  const handleStartDateChange = (startDateStr: string) => {
    const weeks = parseInt(formData.number_of_weeks) || 15
    let newEndDate = ''
    if (startDateStr) {
      const sd = new Date(startDateStr)
      sd.setDate(sd.getDate() + weeks * 7)
      newEndDate = sd.toISOString().split('T')[0]
    }

    setFormData((prev) => ({
      ...prev,
      start_date: startDateStr,
      end_date: newEndDate,
    }))
  }

  // Financial calculations
  const numAmount = Number(formData.amount) || 0
  const numRate = parseFloat(formData.interest_rate) || 0
  const numWeeks = parseInt(formData.number_of_weeks) || 15
  const calculatedEmi = Math.round((numRate * numAmount) / 100)
  const calculatedTotal = calculatedEmi * numWeeks
  const calculatedInterest = Math.max(0, calculatedTotal - numAmount)

  // Due schedule preview calculations
  const previewFirstDue = useMemo(() => {
    if (!formData.disbursement_date) return null
    return getFirstDueDate(formData.disbursement_date, formData.weekly_batch || 'tuesday')
  }, [formData.disbursement_date, formData.weekly_batch])

  const previewSchedule = useMemo(() => {
    if (!formData.disbursement_date) return []
    return generateDueSchedule(
      formData.disbursement_date,
      formData.weekly_batch || 'tuesday',
      numWeeks
    )
  }, [formData.disbursement_date, formData.weekly_batch, numWeeks])

  const previewLastDue = previewSchedule.length > 0 ? previewSchedule[previewSchedule.length - 1] : null

  // Count changed fields
  const changedFieldsCount = useMemo(() => {
    let count = 0
    Object.keys(formData).forEach((key) => {
      if ((formData as any)[key] !== (initialDataSnapshot as any)[key]) {
        count++
      }
    })
    if (photoFile !== null || isPhotoRemoved) count++
    return count
  }, [formData, initialDataSnapshot, photoFile, isPhotoRemoved])

  // Format Aadhaar: 0000-0000-0000
  const handleAadhaarChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 12)
    let formatted = digits
    if (digits.length > 8) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`
    }
    setFormData((prev) => ({ ...prev, aadhaar_number: formatted }))
  }

  // Handle Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photo: 'Photo size must be less than 5MB' }))
      return
    }

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setIsPhotoRemoved(false)
    setErrors((prev) => ({ ...prev, photo: '' }))
  }

  // Handle Live Location detection
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, address: 'Geolocation is not supported by your browser' }))
      return
    }

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(7)
        const lng = pos.coords.longitude.toFixed(7)
        setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          )
          const data = await res.json()
          if (data && data.display_name) {
            setFormData((prev) => ({ ...prev, address: data.display_name }))
            setLocationSuccess('Location and address captured!')
          } else {
            setLocationSuccess('GPS coordinates captured!')
          }
        } catch {
          setLocationSuccess('GPS coordinates captured!')
        } finally {
          setLocationLoading(false)
        }
      },
      () => {
        setLocationLoading(false)
        setErrors((prev) => ({ ...prev, address: 'Unable to retrieve GPS coordinates.' }))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Validate form
  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formData.customer_name.trim()) errs.customer_name = 'Customer Name is required'
    if (!formData.mobile_number.trim()) {
      errs.mobile_number = 'Mobile Number is required'
    } else if (!/^\d{10}$/.test(formData.mobile_number.replace(/\D/g, ''))) {
      errs.mobile_number = 'Enter a valid 10-digit mobile number'
    }

    if (!formData.address.trim()) errs.address = 'Address is required'
    if (!numAmount || numAmount <= 0) errs.amount = 'Valid loan amount is required'
    if (!formData.team_leader_id) errs.team_leader_id = 'Team Leader is required'
    if (!formData.start_date) errs.start_date = 'Start Date is required'

    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number)) {
      errs.pan_number = 'PAN format must be ABCDE1234F'
    }

    if (formData.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.toUpperCase())) {
      errs.ifsc_code = 'Invalid IFSC Code (e.g. SBIN0001234)'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Handle Save
  const handleSave = async () => {
    if (!validate()) return

    // Financial warning check
    const termsChanged =
      Number(formData.amount) !== Number(loan.amount) ||
      formData.interest_rate !== String(loan.interest_rate) ||
      Number(formData.number_of_weeks) !== Number(loan.number_of_weeks)

    if (termsChanged && existingPaymentsCount > 0 && !showFinancialWarning) {
      setShowFinancialWarning(true)
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      let finalPhotoUrl = existingPhoto

      // Upload new photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `customer-photos/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const { error: uploadErr } = await supabase.storage
          .from('MRGroups')
          .upload(fileName, photoFile, { cacheControl: '3600', upsert: true })

        if (!uploadErr) {
          const { data: publicData } = supabase.storage.from('MRGroups').getPublicUrl(fileName)
          finalPhotoUrl = publicData.publicUrl
        }
      } else if (isPhotoRemoved) {
        finalPhotoUrl = null
      }

      // 1. Update Customers Table
      const customerId = initialCustomer.id || loan.customer_id
      if (customerId) {
        const { error: custErr } = await supabase
          .from('customers')
          .update({
            name: formData.customer_name,
            phone: formData.mobile_number,
            customer_id_display: formData.customer_id_display || undefined,
            relationship: formData.relationship || undefined,
            aadhaar_number: formData.aadhaar_number || undefined,
            pan_number: formData.pan_number ? formData.pan_number.toUpperCase() : undefined,
            address: formData.address,
            latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
            longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
            additional_mobile_1: formData.additional_mobile_1 || undefined,
            additional_mobile_1_name: formData.additional_mobile_1_name || undefined,
            additional_mobile_1_relationship: formData.additional_mobile_1_relationship || undefined,
            additional_mobile_2: formData.additional_mobile_2 || undefined,
            additional_mobile_2_name: formData.additional_mobile_2_name || undefined,
            additional_mobile_2_relationship: formData.additional_mobile_2_relationship || undefined,
            photo_url: finalPhotoUrl,
          })
          .eq('id', customerId)

        if (custErr) throw custErr
      }

      // 2. Update Loans Table
      const { error: loanErr } = await supabase
        .from('loans')
        .update({
          amount: numAmount,
          interest_rate: formData.interest_rate,
          number_of_weeks: numWeeks,
          number_of_members: parseInt(formData.number_of_members) || 1,
          team_leader_id: formData.team_leader_id,
          weekly_batch: formData.weekly_batch,
          loan_purpose: formData.loan_purpose,
          disbursement_date: formData.disbursement_date || null,
          start_date: formData.start_date,
          end_date: formData.end_date,
          customer_bank_name: formData.customer_bank_name || undefined,
          account_number: formData.account_number || undefined,
          ifsc_code: formData.ifsc_code ? formData.ifsc_code.toUpperCase() : undefined,
        })
        .eq('id', loan.id)

      if (loanErr) throw loanErr

      // Broadcast update across active tabs
      try {
        const bc = new BroadcastChannel('collections')
        bc.postMessage({ type: 'loan-updated', loanId: loan.id })
        bc.close()
      } catch {
        // BroadcastChannel may not be supported in some environments
      }

      setSaveSuccess(true)
      setTimeout(() => {
        onSaveSuccess()
        onClose()
      }, 1000)
    } catch (err: any) {
      console.error('Failed to update loan:', err)
      setSaveError(err.message || 'Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-fade-in flex items-center justify-center p-3 sm:p-6">
      {/* Lightbox for Photo Zoom */}
      {photoPreview && (
        <PhotoLightbox
          isOpen={isPhotoLightboxOpen}
          onClose={() => setIsPhotoLightboxOpen(false)}
          photos={[{ url: photoPreview, title: formData.customer_name }]}
          alt={formData.customer_name}
        />
      )}

      {/* Main Modal Card */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        {/* HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-primary-400 font-bold border border-white/15">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">Edit Customer & Loan</h3>
                {changedFieldsCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {changedFieldsCount} Modified
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Loan ID: {loan.loan_id_display || loan.id.slice(0, 8)} · Pre-filled with saved database records
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (changedFieldsCount > 0 && !confirm('You have unsaved changes. Discard and close?')) {
                return
              }
              onClose()
            }}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FINANCIAL IMPACT WARNING DIALOG */}
        {showFinancialWarning && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-start gap-3 animate-fade-in flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 flex-1">
              <strong>Notice: Financial Terms Alteration</strong>
              <p className="mt-1 text-amber-800">
                This loan has {existingPaymentsCount} recorded collection entries. Changing the principal amount,
                interest rate, or number of weeks will recalculate future weekly dues. Existing collections will
                remain preserved.
              </p>
            </div>
            <button
              onClick={() => setShowFinancialWarning(false)}
              className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg text-xs hover:bg-amber-700"
            >
              I Understand
            </button>
          </div>
        )}

        {/* ERROR NOTIFICATION */}
        {saveError && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-xs text-rose-700 flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* SCROLLABLE FORM BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* SECTION A: CUSTOMER INFORMATION */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <User className="w-4 h-4 text-primary-600" />
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                A) Customer Information
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Customer ID Display */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer ID (Readable)</label>
                <input
                  type="text"
                  value={formData.customer_id_display}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customer_id_display: e.target.value }))
                  }
                  placeholder="e.g. 1042"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white font-mono text-slate-900 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Customer Name */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customer_name: e.target.value }))
                  }
                  className={`w-full h-11 px-3.5 rounded-xl border bg-white font-semibold text-slate-900 ${
                    errors.customer_name ? 'border-rose-500 bg-rose-50' : 'border-slate-200'
                  }`}
                />
                {errors.customer_name && (
                  <span className="text-[11px] text-rose-600 mt-1 block">{errors.customer_name}</span>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={formData.mobile_number}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      mobile_number: e.target.value.replace(/\D/g, ''),
                    }))
                  }
                  className={`w-full h-11 px-3.5 rounded-xl border bg-white font-mono text-slate-900 ${
                    errors.mobile_number ? 'border-rose-500 bg-rose-50' : 'border-slate-200'
                  }`}
                />
                {isMobileChanged && (
                  <span className="text-[10px] text-amber-600 mt-1 font-bold block">
                    Phone changed from {initialCustomer.phone}
                  </span>
                )}
              </div>

              {/* Relationship & Relative Name */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Relationship</label>
                <select
                  value={formData.relationship}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, relationship: e.target.value }))
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900"
                >
                  <option value="">Select Relationship</option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aadhaar Number */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Aadhaar Number (12 Digits)</label>
                <input
                  type="text"
                  maxLength={14}
                  value={formData.aadhaar_number}
                  onChange={(e) => handleAadhaarChange(e.target.value)}
                  placeholder="0000-0000-0000"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white font-mono text-slate-900"
                />
              </div>

              {/* PAN Number */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">PAN Number</label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.pan_number}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, pan_number: e.target.value.toUpperCase() }))
                  }
                  placeholder="ABCDE1234F"
                  className={`w-full h-11 px-3.5 rounded-xl border bg-white font-mono uppercase text-slate-900 ${
                    errors.pan_number ? 'border-rose-500 bg-rose-50' : 'border-slate-200'
                  }`}
                />
              </div>
            </div>

            {/* Address with Live Location GPS Button */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 text-xs">
                  Address <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className="px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  {locationLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <MapPin className="w-3 h-3 text-primary-600" />
                  )}
                  <span>Detect Live Location</span>
                </button>
              </div>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                className={`w-full p-3 rounded-xl border bg-white text-xs text-slate-900 ${
                  errors.address ? 'border-rose-500 bg-rose-50' : 'border-slate-200'
                }`}
              />
              {locationSuccess && (
                <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
                  ✓ {locationSuccess}
                </span>
              )}
            </div>

            {/* Additional Contacts */}
            <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Additional Contact 1</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    placeholder="Mobile"
                    maxLength={10}
                    value={formData.additional_mobile_1}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, additional_mobile_1: e.target.value }))
                    }
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Name / Rel."
                    value={formData.additional_mobile_1_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, additional_mobile_1_name: e.target.value }))
                    }
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Additional Contact 2</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    placeholder="Mobile"
                    maxLength={10}
                    value={formData.additional_mobile_2}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, additional_mobile_2: e.target.value }))
                    }
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Name / Rel."
                    value={formData.additional_mobile_2_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, additional_mobile_2_name: e.target.value }))
                    }
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B: CUSTOMER PHOTO */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Upload className="w-4 h-4 text-primary-600" />
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                B) Customer Photo
              </h4>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Photo Preview Thumbnail */}
              <div
                onClick={() => photoPreview && setIsPhotoLightboxOpen(true)}
                className="relative w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 bg-white overflow-hidden flex items-center justify-center flex-shrink-0 cursor-pointer shadow-sm hover:border-primary-500 transition-all group"
              >
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Customer" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-bold transition-opacity">
                      Click to Zoom
                    </div>
                  </>
                ) : (
                  <div className="text-center p-2 text-slate-400 text-[11px]">
                    <User className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                    <span>No Photo</span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="space-y-2 text-xs flex-1">
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold cursor-pointer transition-colors shadow-sm inline-flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>

                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null)
                        setPhotoPreview(null)
                        setIsPhotoRemoved(true)
                      }}
                      className="px-3 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold transition-colors inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Supported formats: JPG, PNG, WebP (Max size: 5MB). Photo updates automatically upon saving.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION C: LOAN INFORMATION */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <CreditCard className="w-4 h-4 text-primary-600" />
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                C) Loan Information
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Loan Amount */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Loan Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  className={`w-full h-11 px-3.5 rounded-xl border bg-white font-black text-slate-900 ${
                    errors.amount ? 'border-rose-500 bg-rose-50' : 'border-slate-200'
                  }`}
                />
              </div>

              {/* Number of Weeks */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Number of Weeks</label>
                <select
                  value={formData.number_of_weeks}
                  onChange={(e) => handleWeeksChange(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
                >
                  <option value="10">10 Weeks</option>
                  <option value="12">12 Weeks</option>
                  <option value="15">15 Weeks (Standard)</option>
                  <option value="20">20 Weeks</option>
                  <option value="25">25 Weeks</option>
                  <option value="30">30 Weeks</option>
                </select>
              </div>

              {/* Interest Rate (Auto-calculated, read-only) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Interest Rate (%)</label>
                <input
                  type="text"
                  readOnly
                  value={`${formData.interest_rate}%`}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-700"
                />
              </div>

              {/* Team Leader */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Team Leader <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.team_leader_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, team_leader_id: e.target.value }))
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
                >
                  <option value="">Select Team Leader</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Weekly Batch */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Weekly Batch Day</label>
                <select
                  value={formData.weekly_batch}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, weekly_batch: e.target.value as any }))
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 capitalize"
                >
                  <option value="tuesday">Tuesday Batch</option>
                  <option value="thursday">Thursday Batch</option>
                  <option value="friday">Friday Batch</option>
                </select>
              </div>

              {/* Loan Purpose */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Loan Purpose</label>
                <select
                  value={formData.loan_purpose}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, loan_purpose: e.target.value }))
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900"
                >
                  {LOAN_PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recalculation Summary Card */}
            <div className="mt-3 p-4 rounded-xl bg-primary-50/70 border border-primary-100 grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[10px] font-bold text-primary-700 uppercase tracking-wider block">
                  Weekly EMI
                </span>
                <strong className="text-base font-black text-primary-950">
                  {formatCurrency(calculatedEmi)}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-primary-700 uppercase tracking-wider block">
                  Total Payable
                </span>
                <strong className="text-base font-black text-primary-950">
                  {formatCurrency(calculatedTotal)}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-primary-700 uppercase tracking-wider block">
                  Total Interest
                </span>
                <strong className="text-base font-black text-primary-950">
                  {formatCurrency(calculatedInterest)}
                </strong>
              </div>
            </div>
          </div>

          {/* SECTION D: IMPORTANT DATES */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Calendar className="w-4 h-4 text-primary-600" />
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                D) Important Dates
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Loan Disbursement Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.disbursement_date}
                  max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, disbursement_date: e.target.value }))
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Date funds handed to customer
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  End Date (Auto-calculated)
                </label>
                <input
                  type="date"
                  readOnly
                  value={formData.end_date}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-medium cursor-not-allowed"
                />
              </div>
            </div>

            {/* Live Due Schedule Preview Card */}
            {formData.disbursement_date && previewFirstDue && (
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 animate-fadeIn">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900 mb-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    First Due & Repayment Schedule Preview
                  </span>
                  <span className="capitalize font-black text-indigo-700">
                    {formData.weekly_batch} Batch
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white/80 p-2 rounded-lg border border-indigo-100/60">
                    <span className="text-[10px] text-slate-500 block font-semibold">1st Due Date</span>
                    <strong className="text-emerald-700 font-extrabold text-xs">
                      {formatDueDate(previewFirstDue)}
                    </strong>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-indigo-100/60">
                    <span className="text-[10px] text-slate-500 block font-semibold">Total Weekly Dues</span>
                    <strong className="text-slate-800 font-extrabold text-xs">
                      {numWeeks} Weekly EMIs
                    </strong>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-indigo-100/60">
                    <span className="text-[10px] text-slate-500 block font-semibold">Final Due Date</span>
                    <strong className="text-slate-800 font-extrabold text-xs">
                      {previewLastDue ? formatDueDate(previewLastDue) : '—'}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION E: BANK INFORMATION */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Building className="w-4 h-4 text-primary-600" />
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                E) Bank Information
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Bank Name</label>
                <select
                  value={formData.customer_bank_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customer_bank_name: e.target.value }))
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900"
                >
                  <option value="">Select Bank</option>
                  {POPULAR_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, account_number: e.target.value }))
                  }
                  placeholder="e.g. 123456789012"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">IFSC Code</label>
                <input
                  type="text"
                  maxLength={11}
                  value={formData.ifsc_code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. SBIN0001234"
                  className={`w-full h-11 px-3.5 rounded-xl border bg-white font-mono uppercase text-slate-900 ${
                    errors.ifsc_code ? 'border-rose-500 bg-rose-50' : 'border-slate-200'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* STICKY FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              if (changedFieldsCount > 0 && !confirm('Discard unsaved modifications?')) return
              onClose()
            }}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {changedFieldsCount > 0 && (
              <span className="text-xs text-slate-500 hidden sm:inline">
                {changedFieldsCount} unsaved {changedFieldsCount === 1 ? 'change' : 'changes'}
              </span>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || saveSuccess}
              className={`px-6 py-2.5 rounded-xl text-xs font-black text-white flex items-center gap-2 shadow-lg transition-all ${
                saveSuccess
                  ? 'bg-emerald-600'
                  : 'bg-primary-600 hover:bg-primary-700 active:scale-95'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Saved Successfully!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

