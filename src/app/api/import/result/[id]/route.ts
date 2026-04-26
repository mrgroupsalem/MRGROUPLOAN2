import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: 'Import ID is required' }, { status: 400 })
    }

    // Get import result from database
    const { data, error } = await supabase
      .from('import_results')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching import result:', error)
      return NextResponse.json({ error: 'Failed to fetch import result' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Import result API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
