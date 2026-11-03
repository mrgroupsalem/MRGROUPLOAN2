import { NextResponse } from 'next/server'
import { getSupabaseAdmin, logSecurityEvent, validatePasswordStrength } from '@/lib/security'

export const dynamic = 'force-dynamic'

/**
 * Provision an authorized admin user.
 * Restricted to super_admin or master bootstrap authorization.
 */
export async function POST(request: Request) {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  try {
    const { email, password, fullName, role = 'admin', bootstrapSecret } = await request.json()

    // Protect endpoint: require bootstrap secret or valid master key
    const requiredSecret = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16)
    if (!bootstrapSecret || bootstrapSecret !== requiredSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized admin provisioning request.' },
        { status: 403 }
      )
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    const strengthCheck = validatePasswordStrength(password)
    if (!strengthCheck.valid) {
      return NextResponse.json(
        { success: false, error: strengthCheck.errors.join(' ') },
        { status: 400 }
      )
    }

    const cleanEmail = email.toLowerCase().trim()
    const supabase = getSupabaseAdmin()

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true, // Confirm email for initial provisioned admin
      user_metadata: {
        full_name: fullName || 'System Administrator',
        role: role,
      },
    })

    if (authError || !authUser.user) {
      return NextResponse.json(
        { success: false, error: authError?.message || 'Failed to create Supabase Auth user.' },
        { status: 400 }
      )
    }

    // Insert or update record in public.admin_users
    const { error: dbError } = await supabase.from('admin_users').upsert({
      id: authUser.user.id,
      email: cleanEmail,
      full_name: fullName || 'System Administrator',
      role,
      is_active: true,
      updated_at: new Date().toISOString(),
    })

    if (dbError) {
      console.warn('Notice inserting into admin_users (table may need migration):', dbError)
    }

    await logSecurityEvent({
      eventType: 'admin_account_provisioned',
      userEmail: cleanEmail,
      userId: authUser.user.id,
      ipAddress,
      userAgent,
      success: true,
      metadata: { role },
    })

    return NextResponse.json({
      success: true,
      message: `Admin account ${cleanEmail} provisioned successfully.`,
      user: {
        id: authUser.user.id,
        email: cleanEmail,
        role,
      },
    })
  } catch (error: any) {
    console.error('Create admin error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to provision admin account.' },
      { status: 500 }
    )
  }
}

