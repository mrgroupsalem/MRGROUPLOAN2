'use client'

import EditLoanForm from '@/components/EditLoanForm'
import { Loan, Employee } from '@/types'

interface EditCustomerLoanModalProps {
  loan: Loan
  employees: Employee[]
  isOpen: boolean
  onClose: () => void
  onSaveSuccess: () => void
}

export default function EditCustomerLoanModal({
  loan,
  employees,
  isOpen,
  onClose,
  onSaveSuccess,
}: EditCustomerLoanModalProps) {
  return (
    <EditLoanForm
      loan={loan}
      employees={employees}
      isOpen={isOpen}
      onClose={onClose}
      onSaveSuccess={onSaveSuccess}
    />
  )
}
