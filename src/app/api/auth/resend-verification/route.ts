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

    // Resend confirmation email via Supabase Auth
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: `${baseUrl}/`,
      },
    })

    if (error) {
      console.warn('Resend verification error:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to resend verification email.' },
        { status: 400 }
      )
    }

    await logSecurityEvent({
      eventType: 'email_verification_resent',
      userEmail: cleanEmail,
      ipAddress,
      userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      message: 'A fresh verification link has been sent to your email address.',
    })
  } catch (error: any) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process verification request.' },
      { status: 500 }
    )
  }
}
