import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function toNumber(v: any): number | null {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/[^\d.-]/g, ''))
  return isNaN(n) ? null : n
}

function toISODate(v: any): string | null {
  if (!v) return null
  try {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone, loanData } = body || {}

    if (!phone || !loanData) {
      return NextResponse.json({ error: 'Missing phone or loanData' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server not configured (Supabase service key missing)' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // 1) Ensure customer exists (by phone)
    const { data: existingCustomer, error: fetchErr } = await admin
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .single()

    let customerId: string
    if (fetchErr && fetchErr.code !== 'PGRST116') {
      return NextResponse.json({ error: fetchErr.message || 'Failed to fetch customer' }, { status: 400 })
    }

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      const { data: inserted, error: insErr } = await admin
        .from('customers')
        .insert({
          customer_id_display: loanData.customer?.customer_id_display || null,
          name: loanData.customer?.name,
          phone,
          address: loanData.customer?.address,
          aadhaar_number: loanData.customer?.aadhaar_number,
          pan_number: loanData.customer?.pan_number
        })
        .select('id')
        .single()
      if (insErr) {
        return NextResponse.json({ error: insErr.message || 'Failed to create customer' }, { status: 400 })
      }
      customerId = inserted.id
    }

    // 2) Validate and prepare loan payload
    const amount = toNumber(loanData.amount)
    const numberOfWeeks = toNumber(loanData.number_of_weeks)
    const startDate = toISODate(loanData.start_date)
    let endDate = toISODate(loanData.end_date)

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid loan amount' }, { status: 400 })
    }
    if (!numberOfWeeks || numberOfWeeks <= 0) {
      return NextResponse.json({ error: 'Invalid number of weeks' }, { status: 400 })
    }
    if (!startDate) {
      return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })
    }

    if (!endDate) {
      const sd = new Date(startDate)
      sd.setDate(sd.getDate() + numberOfWeeks * 7)
      endDate = sd.toISOString().slice(0, 10)
    }

    // Get customer_id_display for the loan
    let customerIdDisplay = loanData.customer?.customer_id_display
    if (!customerIdDisplay) {
      // If no customer_id_display provided, use phone number as fallback
      customerIdDisplay = phone
    }

    const insertPayload: any = {
      customer_id: customerIdDisplay, // Use customer_id_display instead of UUID
      amount,
      status: loanData.status || 'active',
      start_date: startDate,
      end_date: endDate,
      interest_rate: String(loanData.interest_rate ?? '8.33'),
      number_of_weeks: numberOfWeeks,
      team_leader_id: loanData.team_leader_id || null,
      weekly_batch: loanData.weekly_batch || null,
      loan_purpose: loanData.loan_purpose || null,
      customer_bank_name: loanData.customer_bank_name || null,
      account_number: loanData.account_number || null,
      ifsc_code: loanData.ifsc_code || null
    }

    const { data: loan, error: loanErr } = await admin
      .from('loans')
      .insert(insertPayload)
      .select('id')
      .single()

    if (loanErr) {
      return NextResponse.json({ error: loanErr.message || 'Failed to create loan' }, { status: 400 })
    }

    return NextResponse.json({ success: true, loanId: loan.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}


