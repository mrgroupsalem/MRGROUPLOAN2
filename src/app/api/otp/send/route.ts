import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Supabase admin client (uses service role key to bypass RLS)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

// Send OTP using Twilio Verify API (WhatsApp / SMS)
async function sendViaTwilioVerify(
  accountSid: string,
  authToken: string,
  verifySid: string,
  mobile: string
): Promise<{ success: boolean; error?: string; channel?: string }> {
  const toNumber = `+91${mobile}`
  const url = `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`

  // Attempt WhatsApp first
  try {
    const params = new URLSearchParams()
    params.append('To', toNumber)
    params.append('Channel', 'whatsapp')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const result = await response.json()

    if (response.ok && (result.status === 'pending' || result.sid)) {
      console.log(`Twilio Verify OTP sent via WhatsApp to ${toNumber}`)
      return { success: true, channel: 'WhatsApp' }
    }

    console.warn('Twilio Verify WhatsApp attempt notice:', result)

    // If WhatsApp channel is not supported or errors, fallback to SMS channel
    const smsParams = new URLSearchParams()
    smsParams.append('To', toNumber)
    smsParams.append('Channel', 'sms')

    const smsResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: smsParams.toString(),
    })

    const smsResult = await smsResponse.json()

    if (smsResponse.ok && (smsResult.status === 'pending' || smsResult.sid)) {
      console.log(`Twilio Verify OTP sent via SMS to ${toNumber}`)
      return { success: true, channel: 'SMS' }
    }

    const err = smsResult?.message || result?.message || 'Failed to send verification code'
    return { success: false, error: err }
  } catch (err: any) {
    console.error('Twilio Verify exception:', err)
    return { success: false, error: err.message || 'Network error while contacting Twilio' }
  }
}

// Fallback: Send direct WhatsApp message
async function sendViaDirectWhatsApp(
  accountSid: string,
  authToken: string,
  fromNumberRaw: string,
  mobile: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  let fromNumber = fromNumberRaw.trim().replace(/\s+/g, '')
  if (!fromNumber.startsWith('whatsapp:')) {
    fromNumber = `whatsapp:${fromNumber}`
  }

  const toNumber = `whatsapp:+91${mobile}`
  const messageBody = `Your MR Groups loan application OTP is: *${otp}*\n\nThis OTP is valid for 5 minutes. Do not share it with anyone.`
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  const params = new URLSearchParams()
  params.append('From', fromNumber)
  params.append('To', toNumber)
  params.append('Body', messageBody)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const result = await response.json()
    if (!response.ok) {
      return { success: false, error: result?.message || 'Failed to send WhatsApp message' }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: 'Network error while sending WhatsApp message' }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { mobile } = body

    // Validate mobile number (10-digit Indian mobile)
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return NextResponse.json(
        { success: false, error: 'A valid 10-digit mobile number is required.' },
        { status: 400 }
      )
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { success: false, error: 'Twilio credentials are not configured.' },
        { status: 500 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Rate limit: max 3 OTP requests per mobile per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('otp_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('mobile', mobile)
      .gte('created_at', tenMinutesAgo)

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many OTP requests. Please wait 10 minutes before trying again.' },
        { status: 429 }
      )
    }

    // Generate local OTP as well (for verification fallback)
    const localOtp = generateOTP()
    const otpHash = hashOTP(localOtp)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    let deliveryChannel = 'WhatsApp'

    // Method 1: Use Twilio Verify API if configured
    if (verifySid) {
      const verifyResult = await sendViaTwilioVerify(accountSid, authToken, verifySid, mobile)
      if (!verifyResult.success) {
        // If verify fails, try direct whatsapp if fromNumber is present
        if (fromNumber) {
          const directResult = await sendViaDirectWhatsApp(accountSid, authToken, fromNumber, mobile, localOtp)
          if (!directResult.success) {
            return NextResponse.json(
              { success: false, error: verifyResult.error || directResult.error || 'Failed to send OTP.' },
              { status: 502 }
            )
          }
        } else {
          return NextResponse.json(
            { success: false, error: verifyResult.error || 'Failed to send OTP.' },
            { status: 502 }
          )
        }
      } else {
        deliveryChannel = verifyResult.channel || 'WhatsApp'
      }
    } else if (fromNumber) {
      // Method 2: Direct WhatsApp
      const directResult = await sendViaDirectWhatsApp(accountSid, authToken, fromNumber, mobile, localOtp)
      if (!directResult.success) {
        return NextResponse.json(
          { success: false, error: directResult.error || 'Failed to send WhatsApp message.' },
          { status: 502 }
        )
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Neither Twilio Verify nor WhatsApp From number is configured.' },
        { status: 500 }
      )
    }

    // Clean up old unverified sessions for this mobile
    await supabase
      .from('otp_sessions')
      .delete()
      .eq('mobile', mobile)
      .eq('verified', false)

    // Save session in Supabase
    await supabase
      .from('otp_sessions')
      .insert({
        mobile,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
        verified: false,
      })

    return NextResponse.json({
      success: true,
      message: `OTP sent via ${deliveryChannel} to +91-${mobile.slice(0, 5)}XXXXX. Valid for 5 minutes.`,
      channel: deliveryChannel,
      expiresIn: 300,
    })
  } catch (error: any) {
    console.error('OTP send error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
