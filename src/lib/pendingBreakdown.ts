import { Loan, Collection } from '@/types'
import { generateDueSchedule, formatLongDate } from './dueSchedule'

export interface DueBreakdownItem {
  dueDate: string
  formattedDate: string
  weekNumber: number
  weekLabel: string
  emi: number
  paid: number
  pending: number
  weeksOverdue: number
  status: 'due_today' | 'overdue' | 'paid'
  isOlderThanToday: boolean
}

export function calculateEMI(loan: Partial<Loan>): number {
  const amt = Number(loan.amount) || 0
  const rate = parseFloat(loan.interest_rate || '0') || 0
  if (amt <= 0 || rate <= 0) return 0
  return Math.round((amt * rate) / 100)
}

/**
 * Returns YYYY-MM-DD for a given Date in IST (Asia/Kolkata)
 */
export function getTodayIST(referenceDate: Date = new Date()): string {
  return referenceDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

/**
 * Computes date-by-date pending dues for a loan.
 * Single source of truth for pending dues:
 * ONLY installments with due_date <= today (IST) and pending > 0 are returned.
 * Start Date is ONLY the reference date (Week 1 = start_date + 7 days).
 * Future installments (due_date > today) are Upcoming and NEVER included here.
 * Respects explicit c.due_date and legacy FIFO collections.
 */
export function getPendingDueBreakdown(
  loan: Partial<Loan> & { id: string },
  collections: Collection[] = [],
  referenceDate: Date = new Date()
): DueBreakdownItem[] {
  const emi = calculateEMI(loan)
  if (emi <= 0) return []

  const batchDay = loan.weekly_batch || 'tuesday'
  const tenureWeeks = loan.number_of_weeks || 15
  const baseDate = loan.start_date || (loan.created_at ? loan.created_at.split('T')[0] : '')

  // Week 1 = start_date + 7 days
  const schedule = generateDueSchedule(baseDate, batchDay, tenureWeeks, loan.end_date)
  if (!schedule || schedule.length === 0) return []

  // Filter collections for this loan
  const loanColls = collections.filter((c) => c.loan_id === loan.id)

  // Map of explicit payments by due_date
  const explicitPaidByDueDate: Record<string, number> = {}
  let legacyPool = 0

  loanColls.forEach((c) => {
    const amt = Number(c.amount_collected) || 0
    if (c.due_date) {
      explicitPaidByDueDate[c.due_date] = (explicitPaidByDueDate[c.due_date] || 0) + amt
    } else {
      const noteMatch = (c.notes || '').match(/\[DUE:(\d{4}-\d{2}-\d{2})\]/)
      if (noteMatch && noteMatch[1]) {
        const d = noteMatch[1]
        explicitPaidByDueDate[d] = (explicitPaidByDueDate[d] || 0) + amt
      } else {
        legacyPool += amt
      }
    }
  })

  const todayStr = getTodayIST(referenceDate)
  const [ty, tm, td] = todayStr.split('-').map(Number)
  const todayMs = Date.UTC(ty, tm - 1, td)

  const pendingItems: DueBreakdownItem[] = []

  for (let i = 0; i < schedule.length; i++) {
    const dueDateStr = schedule[i]

    let paid = explicitPaidByDueDate[dueDateStr] || 0

    // Apply legacy pool if needed
    if (paid < emi && legacyPool > 0) {
      const needed = emi - paid
      const take = Math.min(needed, legacyPool)
      paid += take
      legacyPool -= take
    }

    const pending = Math.max(0, emi - paid)

    // Future dues (dueDateStr > todayStr) are Upcoming, NEVER pending or overdue
    if (dueDateStr > todayStr) {
      continue
    }

    // Only dues that have unpaid balance are pending
    if (pending <= 0) {
      continue
    }

    const [dy, dm, dd] = dueDateStr.split('-').map(Number)
    const dueMs = Date.UTC(dy, dm - 1, dd)
    const diffDays = Math.round((todayMs - dueMs) / (1000 * 60 * 60 * 24))

    let status: 'due_today' | 'overdue' = 'due_today'
    let weeksOverdue = 0

    if (dueDateStr === todayStr) {
      status = 'due_today'
      weeksOverdue = 0
    } else {
      status = 'overdue'
      weeksOverdue = Math.max(1, Math.ceil(diffDays / 7))
    }

    pendingItems.push({
      dueDate: dueDateStr,
      formattedDate: formatLongDate(dueDateStr),
      weekNumber: i + 1,
      weekLabel: `Week ${i + 1}`,
      emi,
      paid,
      pending,
      weeksOverdue,
      status,
      isOlderThanToday: status === 'overdue',
    })
  }

  return pendingItems
}

/**
 * Canonical Single Source of Truth for pending dues:
 * Returns ONLY installments where due_date <= today and pending > 0.
 */
export function getPendingDues(
  loan: Partial<Loan> & { id: string },
  collections: Collection[] = [],
  referenceDate: Date = new Date()
): DueBreakdownItem[] {
  return getPendingDueBreakdown(loan, collections, referenceDate)
}

export interface DueScheduleItem {
  weekNumber: number
  dueDate: string
  formattedDate: string
  emi: number
  paid: number
  pending: number
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue' | 'Upcoming'
  weeksOverdue: number
  isSkipped: boolean
  collectedOn?: string
  paymentMode?: string
  collectedBy?: string
}

/**
 * Returns the full week-by-week due schedule for a loan, matching collections,
 * tracking pending balances per due date, and detecting skipped older dues.
 * All installments (1..number_of_weeks) are included.
 */
export function getFullDueSchedule(
  loan: Partial<Loan> & { id: string },
  collections: Collection[] = [],
  employees: any[] = [],
  referenceDate: Date = new Date()
): DueScheduleItem[] {
  const emi = calculateEMI(loan)
  const batchDay = loan.weekly_batch || 'tuesday'
  const tenureWeeks = loan.number_of_weeks || 15
  const baseDate = loan.start_date || (loan.created_at ? loan.created_at.split('T')[0] : '')

  // Week 1 = start_date + 7 days
  const schedule = generateDueSchedule(baseDate, batchDay, tenureWeeks, loan.end_date)
  if (!schedule || schedule.length === 0) return []

  const loanColls = collections.filter((c) => c.loan_id === loan.id)

  // Map collections by due_date
  const collMap: Record<string, { total: number; coll: Collection }> = {}
  let legacyColls: Collection[] = []

  loanColls.forEach((c) => {
    const amt = Number(c.amount_collected) || 0
    if (c.due_date) {
      if (!collMap[c.due_date]) {
        collMap[c.due_date] = { total: amt, coll: c }
      } else {
        collMap[c.due_date].total += amt
      }
    } else {
      const noteMatch = (c.notes || '').match(/\[DUE:(\d{4}-\d{2}-\d{2})\]/)
      if (noteMatch && noteMatch[1]) {
        const d = noteMatch[1]
        if (!collMap[d]) {
          collMap[d] = { total: amt, coll: c }
        } else {
          collMap[d].total += amt
        }
      } else {
        legacyColls.push(c)
      }
    }
  })

  // Sort legacy collections chronologically
  legacyColls.sort((a, b) => new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime())
  let legacyIndex = 0
  let legacyCurrentRemaining = legacyColls.length > 0 ? Number(legacyColls[0].amount_collected) || 0 : 0

  const todayStr = getTodayIST(referenceDate)
  const [ty, tm, td] = todayStr.split('-').map(Number)
  const todayMs = Date.UTC(ty, tm - 1, td)

  const items: DueScheduleItem[] = []

  for (let i = 0; i < schedule.length; i++) {
    const dueDateStr = schedule[i]
    const isFutureDue = dueDateStr > todayStr

    let paid = collMap[dueDateStr]?.total || 0
    let matchedColl = collMap[dueDateStr]?.coll || null

    // Apply FIFO legacy collections if needed
    if (paid < emi && legacyIndex < legacyColls.length) {
      const needed = emi - paid
      while (legacyIndex < legacyColls.length && paid < emi) {
        if (!matchedColl) matchedColl = legacyColls[legacyIndex]
        const take = Math.min(needed, legacyCurrentRemaining)
        paid += take
        legacyCurrentRemaining -= take
        if (legacyCurrentRemaining <= 0) {
          legacyIndex++
          if (legacyIndex < legacyColls.length) {
            legacyCurrentRemaining = Number(legacyColls[legacyIndex].amount_collected) || 0
          }
        }
      }
    }

    const pending = Math.max(0, emi - paid)

    const [dy, dm, dd] = dueDateStr.split('-').map(Number)
    const dueMs = Date.UTC(dy, dm - 1, dd)
    const diffDays = Math.round((todayMs - dueMs) / (1000 * 60 * 60 * 24))
    const weeksOverdue = diffDays > 0 && !isFutureDue ? Math.max(1, Math.ceil(diffDays / 7)) : 0

    let status: 'Paid' | 'Partial' | 'Pending' | 'Overdue' | 'Upcoming' = 'Upcoming'

    if (paid >= emi && emi > 0) {
      status = 'Paid'
    } else if (paid > 0 && paid < emi) {
      status = 'Partial'
    } else if (isFutureDue) {
      status = 'Upcoming'
    } else if (dueDateStr === todayStr) {
      status = 'Pending'
    } else {
      status = 'Overdue'
    }

    // Match collector / mode
    let collectedBy = '—'
    let paymentMode = '—'
    let collectedOn = '—'

    if (matchedColl) {
      collectedOn = matchedColl.collection_date || (matchedColl.created_at ? matchedColl.created_at.split('T')[0] : '—')
      if (matchedColl.worker_id) {
        const emp = employees.find((e: any) => e.id === matchedColl?.worker_id)
        if (emp) collectedBy = emp.name || emp.full_name || 'Staff'
      } else {
        collectedBy = 'Staff'
      }
      const notes = (matchedColl.notes || '').toLowerCase()
      if (notes.includes('upi') || notes.includes('gpay') || notes.includes('phonepe')) {
        paymentMode = 'UPI'
      } else if (notes.includes('bank') || notes.includes('transfer')) {
        paymentMode = 'Bank Transfer'
      } else {
        paymentMode = 'Cash'
      }
    }

    items.push({
      weekNumber: i + 1,
      dueDate: dueDateStr,
      formattedDate: formatLongDate(dueDateStr),
      emi,
      paid,
      pending,
      status,
      weeksOverdue,
      isSkipped: false,
      collectedOn,
      paymentMode,
      collectedBy,
    })
  }

  // Calculate isSkipped:
  // An item is skipped if it has pending > 0 AND dueDate <= todayStr AND there exists any subsequent due (j > i) with paid > 0
  for (let i = 0; i < items.length; i++) {
    if (items[i].pending > 0 && items[i].status !== 'Upcoming') {
      const hasLaterPaid = items.slice(i + 1).some((later) => later.paid > 0)
      if (hasLaterPaid) {
        items[i].isSkipped = true
      }
    }
  }

  return items
}
