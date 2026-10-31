import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

// Verify code with Twilio Verify API
async function checkWithTwilioVerify(
  accountSid: string,
  authToken: string,
  verifySid: string,
  mobile: string,
  code: string
): Promise<{ checked: boolean; valid: boolean; error?: string }> {
  const toNumber = `+91${mobile}`
  const url = `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`

  try {
    const params = new URLSearchParams()
    params.append('To', toNumber)
    params.append('Code', code)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const result = await response.json()

    if (response.ok) {
      const isValid = result.status === 'approved' || result.valid === true
      return { checked: true, valid: isValid }
    }

    // If resource not found or code expired/canceled in Twilio
    if (result.code === 20404 || result.status === 404) {
      return { checked: true, valid: false, error: 'Verification code expired or not found. Please request a new OTP.' }
    }

    return { checked: true, valid: false, error: result.message || 'Incorrect verification code.' }
  } catch (err: any) {
    console.error('Twilio check exception:', err)
    return { checked: false, valid: false, error: err.message }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { mobile, otp } = body

    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return NextResponse.json(
        { success: false, error: 'Valid 10-digit mobile number is required.' },
        { status: 400 }
      )
    }

    if (!otp || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: 'Valid 6-digit OTP is required.' },
        { status: 400 }
      )
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID
    const supabase = getSupabaseAdmin()

    // 1. If Twilio Verify service is configured, check with Twilio Verify
    if (accountSid && authToken && verifySid) {
      const twilioCheck = await checkWithTwilioVerify(accountSid, authToken, verifySid, mobile, otp.trim())
      if (twilioCheck.checked) {
        if (twilioCheck.valid) {
          // Mark any open session as verified in Supabase
          await supabase
            .from('otp_sessions')
            .update({ verified: true })
            .eq('mobile', mobile)

          return NextResponse.json({
            success: true,
            message: 'Mobile number verified successfully!',
          })
        } else {
          return NextResponse.json(
            { success: false, error: twilioCheck.error || 'Incorrect OTP. Please check the code and try again.' },
            { status: 400 }
          )
        }
      }
    }

    // 2. Fallback to Supabase otp_sessions hash verification
    const { data: session, error: fetchError } = await supabase
      .from('otp_sessions')
      .select('*')
      .eq('mobile', mobile)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !session) {
      return NextResponse.json(
        { success: false, error: 'No active OTP found. Please request a new OTP.' },
        { status: 400 }
      )
    }

    if (new Date(session.expires_at) < new Date()) {
      await supabase.from('otp_sessions').delete().eq('id', session.id)
      return NextResponse.json(
        { success: false, error: 'OTP has expired. Please request a new OTP.' },
        { status: 400 }
      )
    }

    if (session.attempts >= 3) {
      await supabase.from('otp_sessions').delete().eq('id', session.id)
      return NextResponse.json(
        { success: false, error: 'Maximum attempts exceeded. Please request a new OTP.' },
        { status: 400 }
      )
    }

    const inputHash = hashOTP(otp.trim())

    if (inputHash !== session.otp_hash) {
      const newAttempts = session.attempts + 1
      await supabase
        .from('otp_sessions')
        .update({ attempts: newAttempts })
        .eq('id', session.id)

      const remaining = 3 - newAttempts
      if (remaining <= 0) {
        await supabase.from('otp_sessions').delete().eq('id', session.id)
        return NextResponse.json(
          { success: false, error: 'Incorrect OTP. Maximum attempts reached. Please request a new OTP.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { success: false, error: `Incorrect OTP. ${remaining} attempt(s) remaining.` },
        { status: 400 }
      )
    }

    // OTP is correct
    await supabase
      .from('otp_sessions')
      .update({ verified: true })
      .eq('id', session.id)

    return NextResponse.json({
      success: true,
      message: 'Mobile number verified successfully!',
    })
  } catch (error: any) {
    console.error('OTP verify error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
