/**
 * Due Schedule & Loan Date Utility for MR Groups Loan Management System
 * Timezone: Asia/Kolkata (IST)
 * 
 * Rules:
 * - Start Date is ONLY the reference date.
 * - Week 1 due date = start_date + 7 days.
 * - Week N due date = start_date + (N * 7) days, for N = 1..number_of_weeks.
 * - End Date = start_date + (number_of_weeks * 7) days (equals the last installment's due date).
 * - Total installments = number_of_weeks. start_date itself is NEVER an installment.
 */

export type BatchDay = 'tuesday' | 'thursday' | 'friday'

export const BATCH_DAY_NAMES: Record<BatchDay, string> = {
  tuesday: 'Tuesday',
  thursday: 'Thursday',
  friday: 'Friday',
}

export const BATCH_DAY_INDEX: Record<BatchDay, number> = {
  tuesday: 2,
  thursday: 4,
  friday: 5,
}

/**
 * Validates whether a date string (YYYY-MM-DD) falls on the specified weekly batch day.
 */
export function isDateOnBatchDay(dateStr: string, batchDay: BatchDay | string = 'tuesday'): boolean {
  if (!dateStr) return false
  const parts = dateStr.split('T')[0].split('-').map(Number)
  if (parts.length < 3 || parts.some(isNaN)) return false
  const [y, m, d] = parts
  const dateObj = new Date(Date.UTC(y, m - 1, d))
  const dayOfWeek = dateObj.getUTCDay()
  const normalized = (batchDay || 'tuesday').toLowerCase() as BatchDay
  return dayOfWeek === BATCH_DAY_INDEX[normalized]
}

/**
 * Auto-calculates End Date based on Start Date and number of weeks:
 * End Date = Start Date + (number_of_weeks * 7) days
 * equals the last installment's due date.
 * e.g., Thu 17 Sep 2026 + 15 * 7 days = Thu 31 Dec 2026
 * e.g., Tue 06 Oct 2026 + 15 * 7 days = Tue 19 Jan 2027
 */
export function calculateEndDate(startDateStr: string, numberOfWeeks: number = 15): string {
  if (!startDateStr) return ''
  const parts = startDateStr.split('T')[0].split('-').map(Number)
  if (parts.length < 3 || parts.some(isNaN)) return ''
  const [y, m, d] = parts
  const current = new Date(Date.UTC(y, m - 1, d))
  const weeks = Math.max(1, numberOfWeeks || 15)
  current.setUTCDate(current.getUTCDate() + weeks * 7)
  return current.toISOString().slice(0, 10)
}

/**
 * Generates the array of installment due dates for a loan.
 * Start Date is ONLY the reference date.
 * Week 1 = start_date + 7 days
 * Week N = start_date + (N * 7) days, N = 1..number_of_weeks
 * Week number_of_weeks = end_date
 */
export function generateDueSchedule(
  startDateStr: string,
  batchDay?: BatchDay | string,
  numberOfWeeks: number = 15,
  storedEndDate?: string
): string[] {
  if (!startDateStr) return []

  const parts = startDateStr.split('T')[0].split('-').map(Number)
  if (parts.length < 3 || parts.some(isNaN)) return []
  const [y, m, d] = parts
  const schedule: string[] = []

  const current = new Date(Date.UTC(y, m - 1, d))
  const totalWeeks = Math.max(1, numberOfWeeks || 15)

  // Start Date is NOT an installment; Week 1 is start_date + 7 days
  current.setUTCDate(current.getUTCDate() + 7)

  for (let i = 0; i < totalWeeks; i++) {
    schedule.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 7)
  }

  // If computed last due date differs from stored end_date, log a warning; never silently change stored dates.
  if (storedEndDate && schedule.length > 0) {
    const computedEnd = schedule[schedule.length - 1]
    const cleanStored = storedEndDate.split('T')[0]
    if (computedEnd !== cleanStored) {
      console.warn(
        `[dueSchedule] Warning: computed last due date (${computedEnd}) differs from stored end_date (${cleanStored}) for start date ${startDateStr}.`
      )
    }
  }

  return schedule
}

/**
 * Checks whether a loan is due in a given week range.
 * A loan is due in a week only if that week contains one of its due dates,
 * and the week starts after start_date.
 */
export function isLoanDueInWeek(
  loan: {
    start_date?: string
    created_at?: string
    end_date?: string
    number_of_weeks?: number
    weekly_batch?: string
  },
  weekStart: Date,
  weekEnd: Date
): boolean {
  const startStr = loan.start_date || (loan.created_at ? loan.created_at.split('T')[0] : '')
  if (!startStr) return true

  const schedule = generateDueSchedule(
    startStr,
    loan.weekly_batch,
    loan.number_of_weeks || 15,
    loan.end_date
  )
  if (schedule.length === 0) return true

  const weekStartTime = weekStart.getTime()
  const weekEndTime = weekEnd.getTime()

  // Week contains at least one installment due date
  return schedule.some((dueStr) => {
    const [y, m, d] = dueStr.split('-').map(Number)
    const dueTime = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getTime()
    return dueTime >= weekStartTime && dueTime <= weekEndTime
  })
}

/**
 * Formats due date into readable string in IST (Asia/Kolkata)
 * e.g. "Tue, 13 Oct 2026"
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
 * Formats date into readable string in IST (Asia/Kolkata) with weekday
 * e.g. "Sat, 31 Oct 2026"
 */
export function formatLongDate(dateStr?: string | null): string {
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
 * Returns the loan end date. If null, calculates from start_date + (weeks * 7) days.
 */
export function getLoanEndDate(loan: {
  start_date?: string
  created_at?: string
  end_date?: string
  number_of_weeks?: number
}): string {
  if (loan.end_date) return loan.end_date
  const startStr = loan.start_date || (loan.created_at ? loan.created_at.split('T')[0] : '')
  if (!startStr) return ''
  return calculateEndDate(startStr, loan.number_of_weeks || 15)
}
