import { NextResponse } from 'next/server'
import { getSupabaseAdmin, logSecurityEvent, verifyAdminAuthorization } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    const cleanEmail = email.toLowerCase().trim()
    const supabase = getSupabaseAdmin()

    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (authError || !authData.user) {
      await logSecurityEvent({
        eventType: 'login_failure',
        userEmail: cleanEmail,
        ipAddress,
        userAgent,
        success: false,
        metadata: { reason: authError?.message || 'Invalid credentials' },
      })

      return NextResponse.json(
        { success: false, error: authError?.message || 'Invalid email or password.' },
        { status: 401 }
      )
    }

    const user = authData.user

    // 2. Verify Email Confirmation Status
    if (!user.email_confirmed_at) {
      await logSecurityEvent({
        eventType: 'login_failure',
        userEmail: cleanEmail,
        userId: user.id,
        ipAddress,
        userAgent,
        success: false,
        metadata: { reason: 'Email not verified' },
      })

      return NextResponse.json({
        success: false,
        emailUnconfirmed: true,
        error: 'Your email address is not verified. Please verify your email before signing in.',
      }, { status: 403 })
    }

    // 3. Verify Server-Side Admin Authorization in public.admin_users
    const adminCheck = await verifyAdminAuthorization({ userId: user.id, email: cleanEmail })

    if (!adminCheck.authorized) {
      // Check if user has admin in user_metadata or if admin_users is empty/pending
      const isMetaAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'super_admin'
      
      if (!isMetaAdmin) {
        await logSecurityEvent({
          eventType: 'login_failure',
          userEmail: cleanEmail,
          userId: user.id,
          ipAddress,
          userAgent,
          success: false,
          metadata: { reason: 'Unauthorized: User is not an authorized administrator' },
        })

        return NextResponse.json({
          success: false,
          unauthorized: true,
          error: 'Access denied. This portal is restricted to authorized administrators only.',
        }, { status: 403 })
      }
    }

    // 4. Update last_login_at in admin_users if record exists
    if (adminCheck.authorized) {
      await supabase
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    // 5. Log Successful Login Event
    await logSecurityEvent({
      eventType: 'login_success',
      userEmail: cleanEmail,
      userId: user.id,
      ipAddress,
      userAgent,
      success: true,
      metadata: { role: adminCheck.role || user.user_metadata?.role || 'admin' },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: adminCheck.role || user.user_metadata?.role || 'admin',
        full_name: user.user_metadata?.full_name || cleanEmail.split('@')[0],
      },
      session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        expires_at: authData.session?.expires_at,
      },
    })
  } catch (error: any) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal security authentication failure.' },
      { status: 500 }
    )
  }
}

