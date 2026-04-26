import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { DashboardStats } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get loan statistics
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('status, amount, created_at')

    if (loansError) {
      console.error('Error fetching loans:', loansError)
      return NextResponse.json({ error: 'Failed to fetch loan data' }, { status: 500 })
    }

    // Get repayment statistics
    const { data: repayments, error: repaymentsError } = await supabase
      .from('repayments')
      .select('amount_paid')

    if (repaymentsError) {
      console.error('Error fetching repayments:', repaymentsError)
      return NextResponse.json({ error: 'Failed to fetch repayment data' }, { status: 500 })
    }

    // Calculate statistics
    const activeLoans = loans?.filter(loan => loan.status === 'active').length || 0
    const closedLoans = loans?.filter(loan => loan.status === 'closed').length || 0
    const pendingLoans = loans?.filter(loan => loan.status === 'pending').length || 0
    
    const totalSanctionedAmount = loans?.reduce((sum, loan) => sum + Number(loan.amount), 0) || 0
    const totalRepayment = repayments?.reduce((sum, repayment) => sum + Number(repayment.amount_paid), 0) || 0

    // Get new loans this month
    const currentMonth = new Date()
    currentMonth.setDate(1)
    const newLoansThisMonth = loans?.filter(loan => 
      new Date(loan.created_at) >= currentMonth
    ).length || 0

    // Mock data for demonstration (replace with actual calculations)
    const stats: DashboardStats = {
      newLoans: newLoansThisMonth,
      activeLoans,
      closedLoans,
      openLoanApplications: pendingLoans,
      newLoanApplications: Math.floor(Math.random() * 5) + 1,
      totalSanctionedAmount,
      applicantsWithUnpaidShortfall: 0,
      totalShortfallAmount: 0,
      todayCollection: 0, // Mock value - replace with actual calculation
      totalRepayment,
      totalDisbursed: totalSanctionedAmount * 0.8, // Mock calculation
      activeSecurities: Math.floor(activeLoans * 0.4), // Mock calculation
      totalWriteOff: totalSanctionedAmount * 0.05, // Mock calculation
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
