import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

// In-flight debounce guard to prevent double-click submissions (within 3 seconds)
let lastSubmissionTime = 0
let lastSubmissionKey = ''

/**
 * GET: Retrieve date-wise payment history for an Individual Leader strictly from Supabase.
 * Does NOT use in-memory caches or frontend mocks as permanent storage.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const leaderId = searchParams.get('leaderId')
    const employeeId = searchParams.get('employeeId')

    if (!leaderId && !employeeId) {
      return NextResponse.json(
        { success: false, error: 'Leader ID or Employee ID is required to fetch payments.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 1. Fetch Leader Record from employees table to confirm valid leader
    const empFilters: string[] = []
    if (employeeId) empFilters.push(`id.eq.${employeeId}`)
    if (leaderId) {
      empFilters.push(`id.eq.${leaderId}`)
      empFilters.push(`leader_id.eq.${leaderId}`)
    }

    const { data: leaderEmployees } = await supabase
      .from('employees')
      .select('*')
      .or(empFilters.join(','))
      .limit(1)

    const leaderEmp = leaderEmployees && leaderEmployees.length > 0 ? leaderEmployees[0] : null
    const authoritativeEmployeeId = leaderEmp?.id || employeeId
    const authoritativeLeaderCode = leaderEmp?.leader_id || leaderId || authoritativeEmployeeId

    // 2. Fetch payments from Supabase leader_commission_payments table
    const paymentFilters: string[] = []
    if (authoritativeEmployeeId) {
      paymentFilters.push(`employee_id.eq.${authoritativeEmployeeId}`)
      paymentFilters.push(`leader_id.eq.${authoritativeEmployeeId}`)
    }
    if (authoritativeLeaderCode) {
      paymentFilters.push(`leader_id.eq.${authoritativeLeaderCode}`)
      paymentFilters.push(`employee_id.eq.${authoritativeLeaderCode}`)
    }

    const { data, error } = await supabase
      .from('leader_commission_payments')
      .select('*')
      .or(paymentFilters.join(','))
      .order('payment_date', { ascending: false })

    if (error) {
      // If table has not been created yet in Supabase
      if (
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache') ||
        error.code === '42P01' ||
        error.code === 'PGRST204' ||
        error.code === 'PGRST205'
      ) {
        return NextResponse.json({
          success: false,
          error: "Database table 'leader_commission_payments' has not been created in Supabase yet. Please execute migrations/add_leader_commission_payments.sql in the Supabase SQL Editor.",
          tablePending: true,
          payments: [],
          totalPaid: 0
        }, { status: 404 })
      }
      throw error
    }

    const payments = data || []
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || p.amount_paid || 0), 0)

    return NextResponse.json({
      success: true,
      payments,
      totalPaid,
      tablePending: false
    })
  } catch (error: any) {
    console.error('Error fetching commission payments from Supabase:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch commission payments from Supabase.' },
      { status: 500 }
    )
  }
}

/**
 * POST: Record a new payment transaction permanently in Supabase.
 * - Enforces server-side validation against authoritative loans records.
 * - Blocks payments exceeding remaining balance.
 * - Blocks duplicate rapid clicks.
 * - NEVER confirms success if the Supabase database insert fails.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      leaderId,
      employeeId,
      leaderName,
      amountPaid,
      paymentDate,
      paymentMethod = 'Cash',
      referenceNumber,
      notes,
      recordedBy = 'Admin',
      commissionRate = 500
    } = body

    // 1. Basic validation
    const amount = Number(amountPaid)
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Payment amount must be greater than ₹0.' },
        { status: 400 }
      )
    }

    if (!paymentDate) {
      return NextResponse.json(
        { success: false, error: 'Payment date is required.' },
        { status: 400 }
      )
    }

    if (!leaderId && !employeeId) {
      return NextResponse.json(
        { success: false, error: 'Leader ID or Employee ID is required.' },
        { status: 400 }
      )
    }

    // 2. Duplicate submission debounce guard
    const now = Date.now()
    const currentKey = `${leaderId}_${employeeId}_${amount}_${paymentDate}`
    if (currentKey === lastSubmissionKey && (now - lastSubmissionTime) < 3000) {
      return NextResponse.json(
        { success: false, error: 'Duplicate submission detected. Please wait a few seconds before trying again.' },
        { status: 429 }
      )
    }
    lastSubmissionKey = currentKey
    lastSubmissionTime = now

    const supabase = getSupabaseAdmin()

    // 3. Resolve Authoritative Employee & Leader ID
    const empFilters: string[] = []
    if (employeeId) empFilters.push(`id.eq.${employeeId}`)
    if (leaderId) {
      empFilters.push(`id.eq.${leaderId}`)
      empFilters.push(`leader_id.eq.${leaderId}`)
    }

    const { data: leaderEmployees } = await supabase
      .from('employees')
      .select('*')
      .or(empFilters.join(','))
      .limit(1)

    const leaderEmp = leaderEmployees && leaderEmployees.length > 0 ? leaderEmployees[0] : null
    const authoritativeEmployeeId = leaderEmp?.id || employeeId
    const authoritativeLeaderCode = leaderEmp?.leader_id || leaderId || authoritativeEmployeeId
    const resolvedLeaderName = leaderEmp?.name || leaderName || 'Leader'

    // 4. Calculate Authoritative Commission from Loans Table
    // Count each distinct successfully created eligible loan (first-time or renewal)
    const leaderMatch = [
      authoritativeEmployeeId ? `team_leader_id.eq.${authoritativeEmployeeId}` : null,
      authoritativeLeaderCode ? `team_leader_id.eq.${authoritativeLeaderCode}` : null
    ].filter(Boolean).join(',')

    const { data: eligibleLoans, error: loansErr } = await supabase
      .from('loans')
      .select('id, status')
      .or(leaderMatch)

    if (loansErr) {
      console.error('Error querying leader loans for commission calculation:', loansErr)
      throw new Error(`Failed to verify loan records: ${loansErr.message}`)
    }

    const eligibleCount = (eligibleLoans || []).filter(
      l => l.status === 'active' || l.status === 'closed'
    ).length

    const rate = Number(commissionRate) || 500
    const totalEarnedCommission = eligibleCount * rate

    // 5. Query Authoritative Saved Payments from Supabase to compute balance
    const paymentFilters: string[] = []
    if (authoritativeEmployeeId) {
      paymentFilters.push(`employee_id.eq.${authoritativeEmployeeId}`)
      paymentFilters.push(`leader_id.eq.${authoritativeEmployeeId}`)
    }
    if (authoritativeLeaderCode) {
      paymentFilters.push(`leader_id.eq.${authoritativeLeaderCode}`)
      paymentFilters.push(`employee_id.eq.${authoritativeLeaderCode}`)
    }

    const { data: existingPayments, error: payFetchErr } = await supabase
      .from('leader_commission_payments')
      .select('amount, amount_paid')
      .or(paymentFilters.join(','))

    if (payFetchErr) {
      if (
        payFetchErr.message?.includes('does not exist') ||
        payFetchErr.message?.includes('schema cache') ||
        payFetchErr.code === '42P01' ||
        payFetchErr.code === 'PGRST204' ||
        payFetchErr.code === 'PGRST205'
      ) {
        return NextResponse.json({
          success: false,
          error: "Database table 'leader_commission_payments' has not been created in Supabase yet. Please run migrations/add_leader_commission_payments.sql in your Supabase SQL Editor.",
          tablePending: true
        }, { status: 400 })
      }
      throw payFetchErr
    }

    const previousTotalPaid = (existingPayments || []).reduce(
      (sum, p) => sum + Number(p.amount || p.amount_paid || 0),
      0
    )

    const remainingBalance = Math.max(0, totalEarnedCommission - previousTotalPaid)

    // 6. Overpayment Validation (Strictly block payments exceeding remaining balance)
    if (amount > remainingBalance) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount (₹${amount.toLocaleString()}) exceeds the remaining balance (₹${remainingBalance.toLocaleString()}). Maximum payable amount is ₹${remainingBalance.toLocaleString()}.`,
          remainingBalance,
          totalEarnedCommission,
          previousTotalPaid
        },
        { status: 400 }
      )
    }

    // 7. Insert Payment Record into Supabase
    const newPaymentRecord = {
      leader_id: String(authoritativeEmployeeId || authoritativeLeaderCode),
      employee_id: authoritativeEmployeeId ? String(authoritativeEmployeeId) : null,
      leader_name: resolvedLeaderName,
      amount: amount,
      amount_paid: amount,
      payment_date: paymentDate,
      payment_method: paymentMethod || 'Cash',
      reference_number: referenceNumber ? String(referenceNumber).trim() : null,
      notes: notes ? String(notes).trim() : null,
      recorded_by: recordedBy || 'Admin'
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('leader_commission_payments')
      .insert(newPaymentRecord)
      .select('*')
      .single()

    // NEVER confirm success if the Supabase insert fails!
    if (insertErr || !inserted) {
      console.error('Supabase payment insert failed:', insertErr)
      return NextResponse.json(
        {
          success: false,
          error: insertErr?.message || 'Database error: failed to save payment record in Supabase.'
        },
        { status: 500 }
      )
    }

    const newTotalPaid = previousTotalPaid + amount
    const newRemainingBalance = Math.max(0, totalEarnedCommission - newTotalPaid)

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${amount.toLocaleString()} recorded successfully in Supabase for ${resolvedLeaderName}.`,
      payment: inserted,
      totalEarnedCommission,
      totalAmountPaid: newTotalPaid,
      remainingBalance: newRemainingBalance,
      eligibleLoansCount: eligibleCount
    })
  } catch (error: any) {
    console.error('Payment recording error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record commission payment.' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Controlled payment record reversal strictly in Supabase
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('id')

    if (!paymentId) {
      return NextResponse.json({ success: false, error: 'Payment ID is required.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('leader_commission_payments')
      .delete()
      .eq('id', paymentId)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Payment record deleted successfully from Supabase.'
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
