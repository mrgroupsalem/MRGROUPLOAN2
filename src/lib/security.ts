import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase admin credentials not configured')
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
  score: number // 0 to 4
}

/**
 * Enterprise Password Policy:
 * - Minimum 12 characters
 * - Uppercase and lowercase letters
 * - Numbers
 * - Special characters (!@#$%^&*()_+-=[]{}|;:,.<>?)
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = []
  let score = 0

  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters in length.')
  } else {
    score += 1
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    errors.push('Password must contain both uppercase and lowercase letters.')
  } else {
    score += 1
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one numerical digit (0-9).')
  } else {
    score += 1
  }

  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]/.test(password)) {
    errors.push('Password must contain at least one special character.')
  } else {
    score += 1
  }

  return {
    valid: errors.length === 0,
    errors,
    score,
  }
}

/**
 * Log a security audit event into public.security_audit_logs.
 * Strips any sensitive data from metadata.
 */
export async function logSecurityEvent({
  eventType,
  userEmail,
  userId,
  ipAddress,
  userAgent,
  success,
  metadata = {},
}: {
  eventType: string
  userEmail: string
  userId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  success: boolean
  metadata?: Record<string, any>
}) {
  try {
    const supabase = getSupabaseAdmin()
    // Sanitize metadata - NEVER allow passwords, tokens, hashes or otp in audit logs
    const safeMetadata = { ...metadata }
    delete safeMetadata.password
    delete safeMetadata.newPassword
    delete safeMetadata.currentPassword
    delete safeMetadata.otp
    delete safeMetadata.token
    delete safeMetadata.accessToken

    await supabase.from('security_audit_logs').insert({
      event_type: eventType,
      user_email: userEmail.toLowerCase().trim(),
      user_id: userId || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      success,
      metadata: safeMetadata,
    })
  } catch (err) {
    console.error('Failed to write security audit log:', err)
  }
}

/**
 * Verify if an auth user ID or email is an authorized, active admin.
 */
export async function verifyAdminAuthorization(identifier: { userId?: string; email?: string }): Promise<{
  authorized: boolean
  role?: string
  adminRecord?: any
}> {
  try {
    const supabase = getSupabaseAdmin()
    let query = supabase.from('admin_users').select('*').eq('is_active', true)

    if (identifier.userId) {
      query = query.eq('id', identifier.userId)
    } else if (identifier.email) {
      query = query.eq('email', identifier.email.toLowerCase().trim())
    } else {
      return { authorized: false }
    }

    const { data, error } = await query.maybeSingle()
    if (error || !data) {
      return { authorized: false }
    }

    return {
      authorized: true,
      role: data.role,
      adminRecord: data,
    }
  } catch (err) {
    console.error('Error verifying admin authorization:', err)
    return { authorized: false }
  }
}

