'use client'

import React, { useState } from 'react'
import { Customer, Loan, Employee } from '@/types'
import {
  User,
  Shield,
  CreditCard,
  Phone,
  MapPin,
  Users,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  PhoneCall,
  Edit,
  AlertCircle,
  FileText,
} from 'lucide-react'
import PhotoLightbox from '@/components/ui/PhotoLightbox'

interface DocumentsDetailsTabProps {
  customer: Customer
  loan?: Loan | null
  employees?: Employee[]
  isAdmin?: boolean
  onEditSection?: (sectionKey?: string) => void
}

export default function DocumentsDetailsTab({
  customer,
  loan,
  employees = [],
  isAdmin = true, // default true for admin dashboard
  onEditSection,
}: DocumentsDetailsTabProps) {
  // Reveal toggles for sensitive numbers
  const [showAadhaar, setShowAadhaar] = useState(false)
  const [showPan, setShowPan] = useState(false)
  const [showBankAcc, setShowBankAcc] = useState(false)

  // Copy success indicator states
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Photo Lightbox state
  const [isPhotoOpen, setIsPhotoOpen] = useState(false)

  const handleCopy = (text: string, key: string) => {
    if (!text || text === 'Not provided') return
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Formatting helpers
  const maskAadhaar = (num?: string | null) => {
    if (!num) return 'Not provided'
    const cleaned = num.replace(/\s+/g, '')
    if (cleaned.length < 4) return cleaned
    return `XXXX-XXXX-${cleaned.slice(-4)}`
  }

  const maskPan = (num?: string | null) => {
    if (!num) return 'Not provided'
    const cleaned = num.trim()
    if (cleaned.length <= 4) return cleaned
    return `${cleaned.slice(0, 2)}XXXXX${cleaned.slice(-3)}`
  }

  const maskAccNumber = (num?: string | null) => {
    if (!num) return 'Not provided'
    const cleaned = num.trim()
    if (cleaned.length <= 4) return cleaned
    return `••••••••${cleaned.slice(-4)}`
  }

  const photoUrl = customer.photo_url || loan?.photo_url || null
  const initials = customer.name
    ? customer.name
        .trim()
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'CU'

  const displayId =
    customer.customer_id_display ||
    loan?.loan_id_display ||
    (customer.id ? customer.id.slice(0, 8).toUpperCase() : 'N/A')

  // Bank fields
  const bankName = loan?.customer_bank_name || (customer as any).bank_name || null
  const accNum = loan?.account_number || (customer as any).account_number || null
  const ifsc = loan?.ifsc_code || (customer as any).ifsc_code || null
  const isBankMissing = !bankName && !accNum && !ifsc

  // Team leader info
  const leaderId = loan?.team_leader_id
  const leaderObj =
    loan?.team_leader || (leaderId ? employees.find((e) => e.id === leaderId) : null)
  const leaderName = leaderObj?.name || (leaderObj as any)?.full_name || 'Unassigned'
  const leaderPhone = leaderObj?.phone || null

  // Lat / Long
  const lat = customer.latitude
  const lng = customer.longitude
  const hasCoordinates = lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))
  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : null

  return (
    <div className="space-y-4 text-xs text-slate-700">
      {/* Lightbox for customer photo */}
      <PhotoLightbox
        isOpen={isPhotoOpen}
        photos={photoUrl ? [{ url: photoUrl, title: customer.name, subtitle: `Customer ID: ${displayId}` }] : []}
        onClose={() => setIsPhotoOpen(false)}
      />

      {/* SECTION A: CUSTOMER PHOTO CARD */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary-600" />
            <span className="font-bold text-slate-900 text-sm">Customer Photo</span>
          </div>
          {photoUrl ? (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Photo Verified
            </span>
          ) : (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              No Photo Uploaded
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div
            onClick={() => {
              if (photoUrl) setIsPhotoOpen(true)
            }}
            className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-xs flex items-center justify-center bg-slate-100 ${
              photoUrl ? 'cursor-zoom-in group' : ''
            }`}
          >
            {photoUrl ? (
              <>
                <img
                  src={photoUrl}
                  alt={customer.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                  Click to Zoom
                </div>
              </>
            ) : (
              <span className="text-3xl font-black text-slate-400">{initials}</span>
            )}
          </div>

          <div className="space-y-1.5 flex-1 text-center sm:text-left">
            <h4 className="text-base font-extrabold text-slate-900">{customer.name}</h4>
            <p className="text-slate-500 font-mono text-xs">ID: {displayId}</p>
            {customer.is_verified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                <Check className="w-3 h-3" /> Fully Verified
              </span>
            )}
            <p className="text-[11px] text-slate-400 pt-1">
              {photoUrl
                ? 'High-resolution customer profile photograph on permanent storage.'
                : 'Customer photograph not uploaded during registration.'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION B: IDENTITY (TEXT) */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-600" />
            <span className="font-bold text-slate-900 text-sm">Identity & Government Proofs</span>
          </div>
          {onEditSection && isAdmin && (
            <button
              onClick={() => onEditSection('identity')}
              className="text-slate-400 hover:text-primary-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
              title="Edit Identity Details"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Customer ID</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono font-bold text-slate-900">{displayId}</span>
              <button
                onClick={() => handleCopy(displayId, 'custId')}
                className="text-slate-400 hover:text-slate-700 p-1"
                title="Copy Customer ID"
              >
                {copiedKey === 'custId' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Customer Full Name</span>
            <span className="font-bold text-slate-900 block mt-0.5">{customer.name || 'Not provided'}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Father / Husband / Relationship</span>
            <span className="font-medium text-slate-800 block mt-0.5">{customer.relationship || 'Not provided'}</span>
          </div>

          {/* Aadhaar Number */}
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Aadhaar Number</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono font-bold text-slate-900">
                {showAadhaar ? customer.aadhaar_number || 'Not provided' : maskAadhaar(customer.aadhaar_number)}
              </span>
              {customer.aadhaar_number && isAdmin && (
                <button
                  onClick={() => setShowAadhaar(!showAadhaar)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                  title={showAadhaar ? 'Hide' : 'Show Aadhaar'}
                >
                  {showAadhaar ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              )}
              {customer.aadhaar_number && (
                <button
                  onClick={() => handleCopy(customer.aadhaar_number || '', 'aadhaar')}
                  className="text-slate-400 hover:text-slate-700 p-1"
                  title="Copy Aadhaar Number"
                >
                  {copiedKey === 'aadhaar' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* PAN Number */}
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">PAN Number</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono font-bold text-slate-900 uppercase">
                {showPan ? customer.pan_number || 'Not provided' : maskPan(customer.pan_number)}
              </span>
              {customer.pan_number && isAdmin && (
                <button
                  onClick={() => setShowPan(!showPan)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                  title={showPan ? 'Hide' : 'Show PAN'}
                >
                  {showPan ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              )}
              {customer.pan_number && (
                <button
                  onClick={() => handleCopy(customer.pan_number || '', 'pan')}
                  className="text-slate-400 hover:text-slate-700 p-1"
                  title="Copy PAN Number"
                >
                  {copiedKey === 'pan' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION C: BANK DETAILS (TEXT) */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-600" />
            <span className="font-bold text-slate-900 text-sm">Disbursement Bank Account</span>
          </div>
          {isBankMissing && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Bank details missing
            </span>
          )}
          {onEditSection && isAdmin && (
            <button
              onClick={() => onEditSection('bank')}
              className="text-slate-400 hover:text-primary-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
              title="Edit Bank Details"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Bank Name</span>
            <span className="font-bold text-slate-900 block mt-0.5">{bankName || 'Not provided'}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Account Number</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono font-bold text-slate-900">
                {showBankAcc ? accNum || 'Not provided' : maskAccNumber(accNum)}
              </span>
              {accNum && isAdmin && (
                <button
                  onClick={() => setShowBankAcc(!showBankAcc)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                  title={showBankAcc ? 'Hide' : 'Show Account Number'}
                >
                  {showBankAcc ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              )}
              {accNum && (
                <button
                  onClick={() => handleCopy(accNum, 'bankAcc')}
                  className="text-slate-400 hover:text-slate-700 p-1"
                  title="Copy Account Number"
                >
                  {copiedKey === 'bankAcc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">IFSC Code</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono font-bold text-slate-900 uppercase">{ifsc || 'Not provided'}</span>
              {ifsc && (
                <button
                  onClick={() => handleCopy(ifsc, 'ifsc')}
                  className="text-slate-400 hover:text-slate-700 p-1"
                  title="Copy IFSC Code"
                >
                  {copiedKey === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION D: CONTACT NUMBERS */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary-600" />
            <span className="font-bold text-slate-900 text-sm">Contact Numbers</span>
          </div>
          {onEditSection && isAdmin && (
            <button
              onClick={() => onEditSection('contact')}
              className="text-slate-400 hover:text-primary-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
              title="Edit Contact Numbers"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {/* Primary Mobile */}
          <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {customer.phone || 'Not provided'}
                </span>
                <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md">
                  Primary Mobile
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Primary borrower contact number</p>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${customer.phone}`}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-primary-600 hover:border-primary-300 transition-colors"
                  title="Call Borrower"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://wa.me/91${customer.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                  title="WhatsApp Borrower"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleCopy(customer.phone, 'phone')}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                  title="Copy Phone"
                >
                  {copiedKey === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Additional Mobile 1 */}
          {customer.additional_mobile_1 ? (
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {customer.additional_mobile_1}
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-md">
                    {customer.additional_mobile_1_relationship || 'Secondary Mobile'}
                  </span>
                </div>
                {customer.additional_mobile_1_name && (
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Contact: <strong>{customer.additional_mobile_1_name}</strong>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${customer.additional_mobile_1}`}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-primary-600"
                  title="Call"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://wa.me/91${customer.additional_mobile_1.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleCopy(customer.additional_mobile_1 || '', 'addPhone1')}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500"
                  title="Copy"
                >
                  {copiedKey === 'addPhone1' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 text-slate-400 bg-slate-50/50 rounded-xl text-[11px]">
              Additional Mobile 1: Not provided
            </div>
          )}

          {/* Additional Mobile 2 */}
          {customer.additional_mobile_2 ? (
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {customer.additional_mobile_2}
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-md">
                    {customer.additional_mobile_2_relationship || 'Tertiary Mobile'}
                  </span>
                </div>
                {customer.additional_mobile_2_name && (
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Contact: <strong>{customer.additional_mobile_2_name}</strong>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${customer.additional_mobile_2}`}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-primary-600"
                  title="Call"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://wa.me/91${customer.additional_mobile_2.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleCopy(customer.additional_mobile_2 || '', 'addPhone2')}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500"
                  title="Copy"
                >
                  {copiedKey === 'addPhone2' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 text-slate-400 bg-slate-50/50 rounded-xl text-[11px]">
              Additional Mobile 2: Not provided
            </div>
          )}
        </div>
      </div>

      {/* SECTION E: ADDRESS & LOCATION */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-600" />
            <span className="font-bold text-slate-900 text-sm">Address & Geo Location</span>
          </div>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Open in Google Maps
            </a>
          )}
        </div>

        <div className="space-y-2">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Full Residential Address</span>
            <p className="font-medium text-slate-900 mt-0.5 leading-relaxed">
              {customer.address || 'Not provided'}
            </p>
          </div>

          {hasCoordinates && (
            <div className="pt-2 flex items-center gap-4 text-slate-500 font-mono text-[11px]">
              <span>Latitude: <strong>{lat}</strong></span>
              <span>Longitude: <strong>{lng}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION F: TEAM LEADER & LOAN ASSIGNMENT */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600" />
            <span className="font-bold text-slate-900 text-sm">Team Leader & Group Assignment</span>
          </div>
          {onEditSection && isAdmin && (
            <button
              onClick={() => onEditSection('assignment')}
              className="text-slate-400 hover:text-primary-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
              title="Edit Assignment"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Assigned Team Leader</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-bold text-slate-900">{leaderName}</span>
              {leaderPhone && (
                <a
                  href={`tel:${leaderPhone}`}
                  className="text-primary-600 hover:text-primary-800"
                  title="Call Leader"
                >
                  <PhoneCall className="w-3 h-3" />
                </a>
              )}
            </div>
            {leaderPhone && (
              <span className="text-[10px] text-slate-400 font-mono">{leaderPhone}</span>
            )}
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Weekly Batch Day</span>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 capitalize border border-indigo-200">
              {loan?.weekly_batch || 'Tuesday'} Batch
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Loan Purpose</span>
            <span className="font-medium text-slate-800 block mt-0.5">
              {loan?.loan_purpose || 'General / Business'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
