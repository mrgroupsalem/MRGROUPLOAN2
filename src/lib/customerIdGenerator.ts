import { supabase } from './supabase'
import { Employee } from '@/types'

/**
 * Extracts a 3-digit Team Leader code from an Employee object.
 * Priority:
 * 1. 3 consecutive digits in the employee name (e.g. "Santhi (421)", "NANDINI DURAISAMY 475", "RANI 477")
 * 2. 3 consecutive digits in employee email (e.g. "sorna492@gmail.com")
 * 3. 3 consecutive digits in employee id
 * 4. Deterministic 3-digit fallback based on id / name
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

  // 2. Check email for 3-digit sequence
  if (employee.email) {
    const emailMatch = employee.email.match(/\b(\d{3})\b/) || employee.email.match(/(\d{3})/)
    if (emailMatch) {
      return emailMatch[1]
    }
  }

  // 3. Check id for 3-digit sequence
  if (employee.id) {
    const idMatch = employee.id.match(/\b(\d{3})\b/) || employee.id.match(/(\d{3})/)
    if (idMatch) {
      return idMatch[1]
    }
  }

  // 4. Fallback: generate a deterministic 3-digit code from 100-999
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
 * Generates the Customer ID with format TTTYYMMNNN
 * - TTT: Three-digit Team Leader code
 * - YY: Last two digits of creation year
 * - MM: Two-digit creation month
 * - NNN: Three-digit sequential loan number, starting from 001
 */
export function formatCustomerId(
  teamLeaderCode: string,
  year: number,
  month: number,
  sequence: number
): string {
  const ttt = teamLeaderCode.padStart(3, '0').slice(-3)
  const yy = String(year).slice(-2)
  const mm = String(month).padStart(2, '0')
  const nnn = String(sequence).padStart(3, '0')
  return `${ttt}${yy}${mm}${nnn}`
}

/**
 * Fetches the next sequential Customer ID for a given Team Leader.
 * Resets monthly sequence to 001 when a new month begins.
 * Starts from 001 for each Team Leader in each month/year.
 * Prevents duplicates by verifying existing database records.
 */
export async function getNextCustomerIdForTeamLeader(
  employee: Employee | null,
  targetDate: Date = new Date()
): Promise<{ customerId: string; teamLeaderCode: string; sequence: number }> {
  const teamLeaderCode = extractTeamLeaderCode(employee)
  const year = targetDate.getFullYear()
  const month = targetDate.getMonth() + 1

  const yy = String(year).slice(-2)
  const mm = String(month).padStart(2, '0')
  const prefix = `${teamLeaderCode}${yy}${mm}`

  try {
    // Query existing customers matching prefix
    const { data, error } = await supabase
      .from('customers')
      .select('customer_id_display')
      .ilike('customer_id_display', `${prefix}%`)

    if (error) {
      console.error('Error querying customer IDs for sequence:', error)
    }

    let maxSequence = 0
    const existingIds = new Set<string>()

    if (data && data.length > 0) {
      for (const row of data) {
        const idStr = String(row.customer_id_display || '').trim()
        if (idStr) {
          existingIds.add(idStr)
          if (idStr.startsWith(prefix)) {
            const remainder = idStr.substring(prefix.length)
            // Parse sequence number
            const seqNum = parseInt(remainder, 10)
            if (!isNaN(seqNum) && seqNum > maxSequence) {
              maxSequence = seqNum
            }
          }
        }
      }
    }

    let nextSequence = maxSequence + 1
    let candidate = formatCustomerId(teamLeaderCode, year, month, nextSequence)

    // Ensure candidate ID does not collide with any existing customer
    while (existingIds.has(candidate)) {
      nextSequence++
      candidate = formatCustomerId(teamLeaderCode, year, month, nextSequence)
    }

    return {
      customerId: candidate,
      teamLeaderCode,
      sequence: nextSequence
    }
  } catch (err) {
    console.error('Failed to get next customer ID from DB:', err)
    return {
      customerId: formatCustomerId(teamLeaderCode, year, month, 1),
      teamLeaderCode,
      sequence: 1
    }
  }
}

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

