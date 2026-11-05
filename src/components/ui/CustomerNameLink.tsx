'use client'

import React from 'react'
import { Customer, Loan } from '@/types'
import { useCustomerProfile } from '@/context/CustomerProfileContext'

interface CustomerNameLinkProps {
  customer?: Partial<Customer> | null
  customerId?: string
  loan?: Loan | null
  name?: string
  subText?: string | React.ReactNode
  className?: string
  nameClassName?: string
  onClick?: (e: React.MouseEvent) => void
  showSubText?: boolean
}

export default function CustomerNameLink({
  customer,
  customerId,
  loan,
  name,
  subText,
  className = '',
  nameClassName = '',
  onClick,
  showSubText = false,
}: CustomerNameLinkProps) {
  const { openCustomerProfile } = useCustomerProfile()

  const displayName =
    name ||
    customer?.name ||
    loan?.customer?.name ||
    customerId ||
    customer?.customer_id_display ||
    'Customer'

  const resolvedCustomerId =
    customerId ||
    customer?.id ||
    customer?.customer_id_display ||
    loan?.customer_id ||
    ''

  const handleClick = (e: React.MouseEvent) => {
    // Prevent triggering table row selection, accordion expand, or parent click handlers
    e.stopPropagation()

    if (onClick) {
      onClick(e)
    }

    if (resolvedCustomerId) {
      openCustomerProfile(resolvedCustomerId, loan)
    } else if (customer) {
      openCustomerProfile(customer, loan)
    }
  }

  return (
    <span
      className={`inline-flex flex-col relative group/name-link ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center text-left font-bold text-slate-900 group-hover/name-link:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm cursor-pointer transition-colors relative py-0.5 sm:py-0 min-h-[38px] sm:min-h-0 min-w-[44px] justify-start ${nameClassName}`}
        title={`View full profile of ${displayName}`}
      >
        <span className="relative">
          {displayName}
          {/* Animated underline left -> right */}
          <span className="absolute left-0 bottom-0 w-0 h-[1.5px] bg-primary-600 transition-all duration-300 ease-out group-hover/name-link:w-full" />
        </span>
      </button>
      {showSubText && subText && (
        <span className="text-[11px] text-slate-400 font-mono block mt-0.5 pointer-events-none">
          {subText}
        </span>
      )}
    </span>
  )
}

