/**
 * Due Schedule & Disbursement Date Utility for MR Groups Loan Management System
 * Timezone: Asia/Kolkata (IST)
 */

export type BatchDay = 'tuesday' | 'thursday' | 'friday'

/**
 * Batch day offsets from Monday in a calendar week:
 * Tuesday = +1, Thursday = +3, Friday = +4
 */
export const BATCH_DAY_OFFSETS: Record<BatchDay, number> = {
  tuesday: 1,
  thursday: 3,
  friday: 4,
}

/**
 * Calculates First Due Date based on Monday-to-Sunday calendar week rule:
 * First due = batch day in the calendar week AFTER the week of disbursement.
 *
 * Example 1: Disbursed Tue 03/11/2026, batch Tue -> Tue 10/11/2026
 * Example 2: Disbursed Wed 04/11/2026, batch Fri -> Fri 13/11/2026
 * Example 3: Disbursed Mon 09/11/2026, batch Thu -> Thu 19/11/2026
 * Example 4: Disbursed Fri 06/11/2026, batch Tue -> Tue 10/11/2026
 * Example 5: Disbursed Sun 08/11/2026, batch Thu -> Thu 12/11/2026
 *
 * @param disbursementDateStr - YYYY-MM-DD string
 * @param batchDay - 'tuesday' | 'thursday' | 'friday'
 * @returns YYYY-MM-DD string representing the first due date
 */
export function getFirstDueDate(
  disbursementDateStr: string,
  batchDay: BatchDay | string = 'tuesday'
): string {
  if (!disbursementDateStr) return ''

  // Parse YYYY-MM-DD
  const parts = disbursementDateStr.split('T')[0].split('-').map(Number)
  if (parts.length < 3 || parts.some(isNaN)) return ''
  const [year, month, day] = parts

  // Use UTC to prevent browser local timezone skew
  const disbDate = new Date(Date.UTC(year, month - 1, day))

  // 0 = Sunday, 1 = Monday, 2 = Tuesday, ...
  const dow = disbDate.getUTCDay()

  // In Monday-to-Sunday week, Monday diff:
  // If Sunday (0), diff is -6 days to get to Monday of this disbursement week
  // If Monday (1), diff is 0
  // If Tuesday (2), diff is -1, etc.
  const diffToMonday = dow === 0 ? -6 : 1 - dow

  const mondayOfDisbWeek = new Date(disbDate)
  mondayOfDisbWeek.setUTCDate(disbDate.getUTCDate() + diffToMonday)

  // Monday of the NEXT week = Monday of disbursement week + 7 days
  const nextWeekMonday = new Date(mondayOfDisbWeek)
  nextWeekMonday.setUTCDate(mondayOfDisbWeek.getUTCDate() + 7)

  // Batch day offset
  const normalizedBatch = (batchDay || 'tuesday').toLowerCase() as BatchDay
  const offset = BATCH_DAY_OFFSETS[normalizedBatch] ?? 1

  const firstDue = new Date(nextWeekMonday)
  firstDue.setUTCDate(nextWeekMonday.getUTCDate() + offset)

  return firstDue.toISOString().slice(0, 10)
}

/**
 * Generates array of due dates for the loan tenure.
 * Each subsequent due date is 7 days after the previous one.
 */
export function generateDueSchedule(
  disbursementDateStr: string,
  batchDay: BatchDay | string = 'tuesday',
  numberOfWeeks: number = 15
): string[] {
  const firstDueStr = getFirstDueDate(disbursementDateStr, batchDay)
  if (!firstDueStr) return []

  const [year, month, day] = firstDueStr.split('-').map(Number)
  const schedule: string[] = []

  const current = new Date(Date.UTC(year, month - 1, day))
  const totalWeeks = Math.max(1, numberOfWeeks || 15)

  for (let i = 0; i < totalWeeks; i++) {
    schedule.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 7)
  }

  return schedule
}

/**
 * Formats date into readable string in IST (Asia/Kolkata)
 * e.g. "Wed, 04 Nov 2026"
 */
export function formatDisbursementDate(dateStr?: string | null): string {
  if (!dateStr) return 'Not recorded'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Not recorded'

    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return 'Not recorded'
  }
}

/**
 * Formats due date into readable string in IST (Asia/Kolkata)
 * e.g. "Fri, 13 Nov 2026"
 */
export function formatDueDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'

    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

/**
 * Checks whether a loan is active/due in or before a given week range.
 * If disbursement_date is recorded, loans with first due in future weeks
 * are excluded from pending/expected targets for earlier weeks.
 */
export function isLoanDueInWeek(
  loan: {
    disbursement_date?: string
    start_date?: string
    weekly_batch?: string
    created_at?: string
  },
  weekStart: Date,
  weekEnd: Date
): boolean {
  if (loan.disbursement_date) {
    const firstDueStr = getFirstDueDate(loan.disbursement_date, loan.weekly_batch || 'tuesday')
    if (firstDueStr) {
      const [y, m, d] = firstDueStr.split('-').map(Number)
      const firstDueDate = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
      // If the entire week ends BEFORE the first due date, loan is NOT yet due in this week
      if (weekEnd.getTime() < new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).getTime()) {
        return false
      }
    }
  }

  return true
}

