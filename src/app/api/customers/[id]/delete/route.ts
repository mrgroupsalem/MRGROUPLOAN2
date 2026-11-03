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
      return NextResponse.json({ error: 'Server credentials not configured' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const customerId = params.id

    // 1. Fetch customer details
    const { data: customer, error: fetchErr } = await admin
      .from('customers')
      .select('id, phone, customer_id_display')
      .eq('id', customerId)
      .maybeSingle()

    if (fetchErr || !customer) {
      return NextResponse.json({ error: fetchErr?.message || 'Customer not found' }, { status: 404 })
    }

    // 2. Fetch all regular loans for this customer
    const { data: loans } = await admin
      .from('loans')
      .select('id')
      .eq('customer_id', customerId)

    const loanIds = (loans || []).map((l) => l.id)

    // 3. Cascade delete child collections and pending customers
    if (loanIds.length > 0) {
      // Delete collections linked by loan_id
      await admin.from('collections').delete().in('loan_id', loanIds)
      // Delete from pending_customers table
      await admin.from('pending_customers').delete().in('loan_id', loanIds)
    }

    // Also delete any collections linked directly by customer_id
    await admin.from('collections').delete().eq('customer_id', customerId)

    // 4. Delete emergency loans
    if (customer.phone) {
      await admin.from('emergency_loans').delete().eq('mobile_number', customer.phone)
    }
    await admin.from('emergency_loans').delete().eq('customer_id', customerId)

    // 5. Delete loans
    if (loanIds.length > 0) {
      await admin.from('loans').delete().in('id', loanIds)
    }
    await admin.from('loans').delete().eq('customer_id', customerId)

    // 6. Delete the customer record itself
    const { error: delErr } = await admin
      .from('customers')
      .delete()
      .eq('id', customerId)

    if (delErr) {
      return NextResponse.json({ error: delErr.message || 'Failed to delete customer' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Customer and all associated records permanently removed.' })
  } catch (e: any) {
    console.error('Delete customer error:', e)
    return NextResponse.json({ error: e?.message || 'Unexpected server error' }, { status: 500 })
  }
}
