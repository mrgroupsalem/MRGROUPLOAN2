import { NextResponse } from 'next/server'
import { getSupabaseAdmin, logSecurityEvent, validatePasswordStrength } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  try {
    const { currentPassword, newPassword, confirmPassword, email } = await request.json()

    if (!email || !currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password, new password, and confirmation are required.' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'New password and confirmation do not match.' },
        { status: 400 }
      )
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: 'New password cannot be the same as your current password.' },
        { status: 400 }
      )
    }

    // Enforce 12-character strong password policy
    const strengthCheck = validatePasswordStrength(newPassword)
    if (!strengthCheck.valid) {
      return NextResponse.json(
        { success: false, error: strengthCheck.errors.join(' ') },
        { status: 400 }
      )
    }

    const cleanEmail = email.toLowerCase().trim()
    const supabase = getSupabaseAdmin()

    // 1. Verify current password by attempting reauthentication
    const { data: authData, error: verifyError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: currentPassword,
    })

    if (verifyError || !authData.user) {
      await logSecurityEvent({
        eventType: 'password_change_failure',
        userEmail: cleanEmail,
        ipAddress,
        userAgent,
        success: false,
        metadata: { reason: 'Incorrect current password' },
      })

      return NextResponse.json(
        { success: false, error: 'The current password you entered is incorrect.' },
        { status: 401 }
      )
    }

    const userId = authData.user.id

    // 2. Update password securely via Supabase Auth Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (updateError) {
      console.error('Failed to update password:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message || 'Failed to update password in authentication system.' },
        { status: 500 }
      )
    }

    // 3. Update last_password_change_at timestamp in admin_users
    await supabase
      .from('admin_users')
      .update({
        last_password_change_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    // 4. Log successful password change audit event
    await logSecurityEvent({
      eventType: 'password_change_success',
      userEmail: cleanEmail,
      userId,
      ipAddress,
      userAgent,
      success: true,
      metadata: { method: 'settings_change_password' },
    })

    return NextResponse.json({
      success: true,
      message: 'Your password has been changed successfully.',
    })
  } catch (error: any) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error while changing password.' },
      { status: 500 }
    )
  }
}

