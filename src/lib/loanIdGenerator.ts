import { Employee, Loan, Customer } from '@/types'
import { extractTeamLeaderCode } from './customerIdGenerator'

/**
 * Returns a clean, human-readable Admin-created Loan ID for display everywhere in the application.
 * GUARANTEE: Never returns a raw internal 36-character Supabase UUID.
 *
 * Priority:
 * 1. Admin-created `loan.loan_id_display` if populated in the database (e.g. "LN-475-001")
 * 2. If `loan_id` is passed and is already human-readable (not a 36-char UUID), returns it
 * 3. Derived from Customer Display ID if available (e.g. Customer "49226106008" -> "LN-492-6008")
 * 4. Deterministic clean badge based on leader code or short token (e.g. "LN-492-01", "LN-09C1FA")
 */
export function getLoanDisplayId(loan?: Partial<Loan> | any | null): string {
  if (!loan) return 'LN-N/A'

  // 1. Explicit Admin-created loan_id_display column
  if (loan.loan_id_display && typeof loan.loan_id_display === 'string' && loan.loan_id_display.trim()) {
    return loan.loan_id_display.trim()
  }

  // 2. Check if loan_id or id is already a non-UUID custom string
  const rawId = String(loan.loan_id || loan.id || '').trim()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)

  if (rawId && !isUuid && !rawId.startsWith('placeholder-') && !rawId.startsWith('emergency-')) {
    return rawId
  }

  // 3. Derived from Customer ID Display (TTTYYMMNNN) -> LN-TTT-NNN
  const custDisplay = loan.customer?.customer_id_display || loan.customer_id_display
  if (custDisplay && typeof custDisplay === 'string' && /^\d+$/.test(custDisplay)) {
    if (custDisplay.length >= 7) {
      const leader = custDisplay.slice(0, 3)
      const seq = custDisplay.slice(-4)
      return `LN-${leader}-${seq}`
    }
    return `LN-${custDisplay}`
  }

  // 4. Fallback if only raw UUID exists: convert to clean branded reference e.g. "LN-09C1FA"
  if (rawId && isUuid) {
    const compactHex = rawId.replace(/-/g, '').slice(0, 6).toUpperCase()
    return `LN-${compactHex}`
  }

  if (rawId) {
    return `LN-${rawId.slice(0, 6).toUpperCase()}`
  }

  return 'LN-001'
}

/**
 * Generates an Admin-created Loan ID with format LN-TTT-NNN
 * - LN: Standard loan prefix
 * - TTT: 3-digit Team Leader code (e.g. 475, 492)
 * - NNN: 3-digit sequential loan number (e.g. 001, 002)
 */
export function formatAdminLoanId(teamLeaderCode: string, sequence: number): string {
  const ttt = String(teamLeaderCode || '100').padStart(3, '0').slice(-3)
  const nnn = String(sequence || 1).padStart(3, '0')
  return `LN-${ttt}-${nnn}`
}

