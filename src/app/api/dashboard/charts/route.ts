import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ChartData } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const chartType = searchParams.get('type') || 'newLoans'
    const period = searchParams.get('period') || '30' // days

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    if (chartType === 'newLoans') {
      // Get new loans data
      const { data: loans, error } = await supabase
        .from('loans')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching new loans:', error)
        return NextResponse.json({ error: 'Failed to fetch new loans data' }, { status: 500 })
      }

      // Group by date
      const groupedData: { [key: string]: number } = {}
      loans?.forEach(loan => {
        const date = new Date(loan.created_at).toISOString().split('T')[0]
        groupedData[date] = (groupedData[date] || 0) + 1
      })

      // Fill in missing dates with 0
      const chartData: ChartData[] = []
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        chartData.push({
          date: dateStr,
          value: groupedData[dateStr] || 0
        })
      }

      return NextResponse.json(chartData)
    }

    if (chartType === 'originations' || chartType === 'loans') {
      // Get loan originations data
      const { data: loans, error } = await supabase
        .from('loans')
        .select('amount, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'active')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching loan originations:', error)
        return NextResponse.json({ error: 'Failed to fetch loan data' }, { status: 500 })
      }

      // Group by date
      const groupedData: { [key: string]: number } = {}
      loans?.forEach(loan => {
        const date = new Date(loan.created_at).toISOString().split('T')[0]
        groupedData[date] = (groupedData[date] || 0) + Number(loan.amount)
      })

      // Fill in missing dates with 0
      const chartData: ChartData[] = []
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        chartData.push({
          date: dateStr,
          value: groupedData[dateStr] || 0
        })
      }

      return NextResponse.json(chartData)
    }

    return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 })
  } catch (error) {
    console.error('Charts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
