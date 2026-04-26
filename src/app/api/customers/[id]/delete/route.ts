import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // Fetch customer to derive possible identifiers used in loans.customer_id
    const { data: customer, error: fetchErr } = await admin
      .from('customers')
      .select('id, phone, customer_id_display')
      .eq('id', params.id)
      .single()

    if (fetchErr || !customer) {
      return NextResponse.json({ error: fetchErr?.message || 'Customer not found' }, { status: 404 })
    }

    // Delete loans and emergency loans linked by customer UUID (primary key)
    // For emergency_loans, also delete by mobile_number which might match customer phone
    if (customer.phone) {
      await admin.from('emergency_loans').delete().eq('mobile_number', customer.phone);
    }
    
    // Delete by customer UUID (primary key) for both regular and emergency loans
    await admin.from('loans').delete().eq('customer_id', params.id);
    await admin.from('emergency_loans').delete().eq('customer_id', params.id);

    // Delete the customer record
    const { error: delErr } = await admin
      .from('customers')
      .delete()
      .eq('id', params.id)

    if (delErr) {
      return NextResponse.json({ error: delErr.message || 'Failed to delete customer' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}


