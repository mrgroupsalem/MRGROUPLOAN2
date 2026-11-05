import { supabase } from './supabase'
import { Employee } from '@/types'

/**
 * Extracts a 3-digit Team Leader code from an Employee object.
 * Priority:
 * 1. 3 consecutive digits in the employee name (e.g. "Santhi (421)", "NANDINI DURAISAMY 475", "RANI 477")
 * 2. 3 consecutive digits in employee email (e.g. "sorna492@gmail.com")
 * 3. 3 consecutive digits in employee leader_id
 * 4. 3 consecutive digits in employee id
 * 5. Deterministic fallback
 */
export function extractTeamLeaderCode(employee?: Employee | null): string {
  if (!employee) return '000'

  // 1. Check direct leader_id first
  if (employee.leader_id) {
    const cleanId = String(employee.leader_id).trim()
    const idMatch = cleanId.match(/\b(\d{3})\b/) || cleanId.match(/(\d{3})/)
    if (idMatch) {
      return idMatch[1]
    }
    if (/^\d+$/.test(cleanId)) {
      return cleanId.padStart(3, '0').slice(-3)
    }
  }

  // 2. Check name for 3-digit sequence
  if (employee.name) {
    const nameMatch = employee.name.match(/\b(\d{3})\b/) || employee.name.match(/(\d{3})/)
    if (nameMatch) {
      return nameMatch[1]
    }
  }

  // 3. Check email for 3-digit sequence
  if (employee.email) {
    const emailMatch = employee.email.match(/\b(\d{3})\b/) || employee.email.match(/(\d{3})/)
    if (emailMatch) {
      return emailMatch[1]
    }
  }

  // 4. Check id for 3-digit sequence
  if (employee.id) {
    const idMatch = employee.id.match(/\b(\d{3})\b/) || employee.id.match(/(\d{3})/)
    if (idMatch) {
      return idMatch[1]
    }
  }

  // 5. Fallback: generate a deterministic 3-digit code from 100-999
  let hash = 0
  const source = employee.id || employee.name || '000'
  for (let i = 0; i < source.length; i++) {
    hash = (hash << 5) - hash + source.charCodeAt(i)
    hash |= 0
  }
  const code = (Math.abs(hash) % 900) + 100
  return String(code)
}

/**
 * Counts DISTINCT customers currently under the given team leader across ALL loans and emergency loans.
 * A customer with multiple loans is counted only once.
 */
export async function getLeaderCustomerCount(leaderId: string): Promise<number> {
  if (!leaderId) return 0
  try {
    const [loansRes, emergencyRes] = await Promise.all([
      supabase.from('loans').select('customer_id').eq('team_leader_id', leaderId),
      supabase.from('emergency_loans').select('customer_id').eq('team_leader_id', leaderId),
    ])

    const uniqueCustomers = new Set<string>()
    if (loansRes.data) {
      for (const row of loansRes.data) {
        if (row.customer_id) {
          uniqueCustomers.add(String(row.customer_id).trim())
        }
      }
    }
    if (emergencyRes.data) {
      for (const row of emergencyRes.data) {
        if (row.customer_id) {
          uniqueCustomers.add(String(row.customer_id).trim())
        }
      }
    }
    return uniqueCustomers.size
  } catch (err) {
    console.error('Error fetching leader customer count:', err)
    return 0
  }
}

/**
 * ONE shared function to generate Customer ID:
 * Format: <leaderCode><YY><MM><runningNumber, min 3 digits>
 * - leaderCode: leader's number (e.g. "RANI 477" -> 477)
 * - date: year and month of loan/customer creation date in IST
 * - leaderCustomerCount: TOTAL number of distinct customers currently under that leader across all time
 * - Running number: (leaderCustomerCount) + 1, min 3 digits
 *
 * The last 3 digits NEVER depend on month or year.
 * Examples:
 * 1. RANI 477 with 14 customers, Nov 2026 -> 4772611015
 * 2. RANI 477 with 14 customers, Jan 2027 -> 4772701015
 * 3. Leader with 0 customers -> ...001
 * 4. Leader with 99 customers -> ...100
 */
export function generateCustomerId(
  leaderCode: string,
  date: Date = new Date(),
  leaderCustomerCount: number = 0
): {
  customerId: string
  leaderCode: string
  year: string
  month: string
  runningNumber: number
  sequenceStr: string
} {
  const cleanLeader = String(leaderCode || '000').trim().padStart(3, '0').slice(-3)

  // Use Asia/Kolkata (IST)
  const istFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: '2-digit',
    month: '2-digit',
  })
  const parts = istFormatter.formatToParts(date)
  const yy = parts.find((p) => p.type === 'year')?.value || String(date.getFullYear()).slice(-2)
  const mm = parts.find((p) => p.type === 'month')?.value || String(date.getMonth() + 1).padStart(2, '0')

  const runningNumber = Math.max(0, leaderCustomerCount) + 1
  const sequenceStr = String(runningNumber).padStart(3, '0')
  const customerId = `${cleanLeader}${yy}${mm}${sequenceStr}`

  return {
    customerId,
    leaderCode: cleanLeader,
    year: yy,
    month: mm,
    runningNumber,
    sequenceStr,
  }
}

/**
 * Fetches the next available Customer ID for a given Team Leader:
 * 1. Counts distinct customers currently under the leader (leaderCustomerCount)
 * 2. Computes runningNumber = leaderCustomerCount + 1
 * 3. Duplicate safety: verifies candidate customer_id_display does not already exist in DB.
 *    If it already exists, keeps incrementing by 1 until a free ID is found.
 */
export async function getNextCustomerIdForTeamLeader(
  employee: Employee | null,
  targetDate: Date = new Date(),
  ignoreCustomerId?: string
): Promise<{
  customerId: string
  teamLeaderCode: string
  sequence: number
  sequenceStr: string
  year: string
  month: string
  leaderCustomerCount: number
}> {
  const teamLeaderCode = extractTeamLeaderCode(employee)
  const leaderId = employee?.id || ''
  const leaderCustomerCount = leaderId ? await getLeaderCustomerCount(leaderId) : 0

  let currentCount = leaderCustomerCount
  let generated = generateCustomerId(teamLeaderCode, targetDate, currentCount)

  try {
    // Check for collisions in customers table
    const { data: existingRecords } = await supabase
      .from('customers')
      .select('id, customer_id_display')
      .ilike('customer_id_display', `${generated.leaderCode}${generated.year}${generated.month}%`)

    const existingIds = new Set<string>()
    if (existingRecords) {
      for (const r of existingRecords) {
        if (ignoreCustomerId && r.id === ignoreCustomerId) continue
        if (r.customer_id_display) {
          existingIds.add(String(r.customer_id_display).trim())
        }
      }
    }

    // If ID is taken, skip to next free number
    while (existingIds.has(generated.customerId)) {
      currentCount++
      generated = generateCustomerId(teamLeaderCode, targetDate, currentCount)
    }

    return {
      customerId: generated.customerId,
      teamLeaderCode: generated.leaderCode,
      sequence: generated.runningNumber,
      sequenceStr: generated.sequenceStr,
      year: generated.year,
      month: generated.month,
      leaderCustomerCount,
    }
  } catch (err) {
    console.error('Error verifying customer ID uniqueness in DB:', err)
    return {
      customerId: generated.customerId,
      teamLeaderCode: generated.leaderCode,
      sequence: generated.runningNumber,
      sequenceStr: generated.sequenceStr,
      year: generated.year,
      month: generated.month,
      leaderCustomerCount,
    }
  }
}

export const generateContinuousCustomerId = getNextCustomerIdForTeamLeader

/**
 * Validates a Customer ID:
 * 1. Non-empty
 * 2. Only numerical digits
 * 3. Enforces uniqueness against database (excluding optional existingCustomerId)
 */
export async function validateCustomerIdUniqueness(
  customerId: string,
  ignoreCustomerId?: string
): Promise<{ valid: boolean; error?: string }> {
  const trimmed = customerId.trim()
  if (!trimmed) {
    return { valid: false, error: 'Customer ID is required' }
  }

  // Must only contain numerical values
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'Customer ID must contain only numerical digits (0-9)' }
  }

  try {
    let query = supabase
      .from('customers')
      .select('id, name, customer_id_display')
      .eq('customer_id_display', trimmed)

    if (ignoreCustomerId) {
      query = query.neq('id', ignoreCustomerId)
    }

    const { data, error } = await query.maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error validating customer ID uniqueness:', error)
    }

    if (data) {
      return {
        valid: false,
        error: `Customer ID "${trimmed}" already exists in the database (Customer: ${data.name || 'Existing'}). Please enter a unique ID.`
      }
    }

    return { valid: true }
  } catch (err) {
    console.error('Validation query error:', err)
    return { valid: true }
  }
}

/**
 * Splits a customer's stored full name into Customer Name and secondary Name
 */
export function splitCustomerNames(fullName?: string | null): { customerName: string; name: string } {
  if (!fullName) return { customerName: '', name: '' }
  const trimmed = fullName.trim()
  const parts = trimmed.split(/\s+/)
  if (parts.length <= 1) {
    return { customerName: trimmed, name: '' }
  }
  return {
    customerName: parts[0],
    name: parts.slice(1).join(' ')
  }
}

/**
 * Combines Customer Name and secondary Name into full name for storage
 */
export function combineCustomerNames(customerName: string, name?: string): string {
  const cName = (customerName || '').trim()
  const n = (name || '').trim()
  if (!cName && !n) return ''
  if (!n) return cName
  if (!cName) return n
  return `${cName} ${n}`
}
