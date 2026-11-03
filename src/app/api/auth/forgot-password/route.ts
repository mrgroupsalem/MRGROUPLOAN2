import { NextResponse } from 'next/server'
import { getSupabaseAdmin, logSecurityEvent } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      )
    }

    const cleanEmail = email.toLowerCase().trim()
    const supabase = getSupabaseAdmin()

    // Determine the base URL dynamically from request headers or environment variable
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
    const dynamicBaseUrl = `${protocol}://${host}`

    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const baseUrl = configuredSiteUrl && !configuredSiteUrl.includes('localhost')
      ? configuredSiteUrl
      : dynamicBaseUrl

    const redirectTo = `${baseUrl}/reset-password`

    // Send recovery email via Supabase Auth
    // Industry standard: return generic response regardless of user existence
    await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    })

    await logSecurityEvent({
      eventType: 'password_reset_request',
      userEmail: cleanEmail,
      ipAddress,
      userAgent,
      success: true,
      metadata: { redirectTo },
    })

    return NextResponse.json({
      success: true,
      message: 'If an authorized admin account exists with this email, instructions have been sent.',
    })
  } catch (error: any) {
    console.error('Password reset request error:', error)
    return NextResponse.json({
      success: true,
      message: 'If an authorized admin account exists with this email, instructions have been sent.',
    })
  }
}
