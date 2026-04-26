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

    // Delete dependent collections first (if any)
    await admin.from('collections').delete().eq('loan_id', params.id)

    // Delete repayments if present
    await admin.from('repayments').delete().eq('loan_id', params.id)

    // Delete the loan
    const { error: delErr } = await admin
      .from('loans')
      .delete()
      .eq('id', params.id)

    if (delErr) {
      return NextResponse.json({ error: delErr.message || 'Failed to delete loan' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}


