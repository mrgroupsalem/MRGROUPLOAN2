import assert from 'assert'
import {
  isDateOnBatchDay,
  calculateEndDate,
  generateDueSchedule,
  formatDueDate,
  formatLongDate,
  getLoanEndDate,
  isLoanDueInWeek,
} from '../dueSchedule'
import {
  getPendingDues,
  getPendingDueBreakdown,
  getFullDueSchedule,
  getTodayIST,
} from '../pendingBreakdown'

export function runDueScheduleTests() {
  console.log('Running Due Schedule & Pending Dues Test Suite...')

  // =========================================================================
  // 1. Batch Day Validation
  // =========================================================================
  assert.strictEqual(isDateOnBatchDay('2026-09-17', 'thursday'), true)
  assert.strictEqual(isDateOnBatchDay('2026-09-17', 'tuesday'), false)
  assert.strictEqual(isDateOnBatchDay('2026-10-06', 'tuesday'), true)
  assert.strictEqual(isDateOnBatchDay('2026-10-09', 'friday'), true)

  // =========================================================================
  // 2. TEST CASE A (from Master Instruction):
  //    Thursday batch, start Thu 17 Sep 2026, end Thu 31 Dec 2026, 15 weeks
  //    Week 1 = 24 Sep, Week 2 = 01 Oct, ... Week 15 = 31 Dec 2026.
  //    Exactly 15 installments, none on 17 Sep.
  // =========================================================================
  const endA = calculateEndDate('2026-09-17', 15)
  assert.strictEqual(endA, '2026-12-31')

  const scheduleA = generateDueSchedule('2026-09-17', 'thursday', 15)
  assert.strictEqual(scheduleA.length, 15)
  assert.strictEqual(scheduleA[0], '2026-09-24') // Week 1 (start + 7 days)
  assert.strictEqual(scheduleA[1], '2026-10-01') // Week 2
  assert.strictEqual(scheduleA[6], '2026-11-05') // Week 7
  assert.strictEqual(scheduleA[7], '2026-11-12') // Week 8
  assert.strictEqual(scheduleA[14], '2026-12-31') // Week 15 (last installment = end_date)
  // Ensure start_date (17 Sep) is NEVER in the installments
  assert.strictEqual(scheduleA.includes('2026-09-17'), false)

  // Test Case A Evaluation at Today = Thu 05 Nov 2026:
  // Weeks 1-7 have elapsed (24 Sep ... 05 Nov).
  // Week 7 (05 Nov) = Due Today. Weeks 8-15 (12 Nov onward) = Upcoming.
  const loanA = {
    id: 'loan-test-a',
    start_date: '2026-09-17',
    end_date: '2026-12-31',
    weekly_batch: 'thursday' as const,
    amount: 15000,
    interest_rate: '8.33',
    number_of_weeks: 15,
  }
  const today05Nov = new Date('2026-11-05T10:00:00+05:30')
  const pendingA = getPendingDues(loanA, [], today05Nov)

  // Exactly 7 dues elapsed
  assert.strictEqual(pendingA.length, 7)
  assert.strictEqual(pendingA[0].dueDate, '2026-09-24')
  assert.strictEqual(pendingA[0].status, 'overdue')
  assert.strictEqual(pendingA[5].dueDate, '2026-10-29')
  assert.strictEqual(pendingA[5].status, 'overdue')
  // Week 7 is Due Today on 05 Nov 2026
  assert.strictEqual(pendingA[6].dueDate, '2026-11-05')
  assert.strictEqual(pendingA[6].status, 'due_today')

  // Weeks 8-15 (12 Nov onward) must NEVER appear in pending
  const futureA = pendingA.filter((p) => p.dueDate > '2026-11-05')
  assert.strictEqual(futureA.length, 0)

  // In full schedule, check upcoming status
  const fullSchedA = getFullDueSchedule(loanA, [], [], today05Nov)
  assert.strictEqual(fullSchedA.length, 15)
  assert.strictEqual(fullSchedA[6].dueDate, '2026-11-05')
  assert.strictEqual(fullSchedA[6].status, 'Pending') // Due Today
  assert.strictEqual(fullSchedA[7].dueDate, '2026-11-12')
  assert.strictEqual(fullSchedA[7].status, 'Upcoming')
  assert.strictEqual(fullSchedA[14].dueDate, '2026-12-31')
  assert.strictEqual(fullSchedA[14].status, 'Upcoming')

  // =========================================================================
  // 3. TEST CASE B (from Master Instruction):
  //    Tuesday batch, start Tue 06 Oct 2026, 15 weeks:
  //    Week 1 = 13 Oct 2026, Week 15 = 19 Jan 2027.
  //    Today = 04 Nov 2026 -> 4 dues elapsed (13 Oct, 20 Oct, 27 Oct, 03 Nov).
  // =========================================================================
  const endB = calculateEndDate('2026-10-06', 15)
  assert.strictEqual(endB, '2027-01-19')

  const scheduleB = generateDueSchedule('2026-10-06', 'tuesday', 15)
  assert.strictEqual(scheduleB.length, 15)
  assert.strictEqual(scheduleB[0], '2026-10-13') // Week 1
  assert.strictEqual(scheduleB[1], '2026-10-20') // Week 2
  assert.strictEqual(scheduleB[2], '2026-10-27') // Week 3
  assert.strictEqual(scheduleB[3], '2026-11-03') // Week 4
  assert.strictEqual(scheduleB[4], '2026-11-10') // Week 5
  assert.strictEqual(scheduleB[14], '2027-01-19') // Week 15

  const loanB = {
    id: 'loan-test-b',
    start_date: '2026-10-06',
    end_date: '2027-01-19',
    weekly_batch: 'tuesday' as const,
    amount: 15000,
    interest_rate: '8.33',
    number_of_weeks: 15,
  }
  const today04Nov = new Date('2026-11-04T12:00:00+05:30')
  const pendingB = getPendingDues(loanB, [], today04Nov)
  // Exactly 4 dues elapsed: 13 Oct, 20 Oct, 27 Oct, 03 Nov
  assert.strictEqual(pendingB.length, 4)
  assert.strictEqual(pendingB[0].dueDate, '2026-10-13')
  assert.strictEqual(pendingB[1].dueDate, '2026-10-20')
  assert.strictEqual(pendingB[2].dueDate, '2026-10-27')
  assert.strictEqual(pendingB[3].dueDate, '2026-11-03')
  assert.strictEqual(pendingB.every((p) => p.dueDate <= '2026-11-04'), true)

  // =========================================================================
  // 4. Test: Today before first due date
  // =========================================================================
  // Loan starts 17 Sep 2026, 1st due is 24 Sep. If today is 18 Sep 2026:
  const today18Sep = new Date('2026-09-18T10:00:00+05:30')
  const pendingBeforeFirstDue = getPendingDues(loanA, [], today18Sep)
  assert.strictEqual(pendingBeforeFirstDue.length, 0)

  // =========================================================================
  // 5. Test: Mid-loan with payment gaps (non-consecutive payments)
  // =========================================================================
  // Customer paid dues for 24 Sep and 08 Oct, but skipped 01 Oct and 15 Oct.
  // At reference date 22 Oct 2026:
  const mockCollsWithGaps = [
    {
      id: 'c1',
      loan_id: 'loan-test-a',
      customer_id: 'cust-1',
      worker_id: 'emp-1',
      amount_collected: 1250,
      remaining_balance: 13750,
      collection_date: '2026-09-24',
      due_date: '2026-09-24',
      status: 'completed' as const,
      created_at: '2026-09-24T10:00:00Z',
    },
    {
      id: 'c2',
      loan_id: 'loan-test-a',
      customer_id: 'cust-1',
      worker_id: 'emp-1',
      amount_collected: 1250,
      remaining_balance: 12500,
      collection_date: '2026-10-08',
      due_date: '2026-10-08',
      status: 'completed' as const,
      created_at: '2026-10-08T10:00:00Z',
    },
  ]
  const today22Oct = new Date('2026-10-22T10:00:00+05:30')
  const pendingWithGaps = getPendingDues(loanA, mockCollsWithGaps, today22Oct)
  // Elapsed by 22 Oct: 24 Sep (paid), 01 Oct (unpaid), 08 Oct (paid), 15 Oct (unpaid), 22 Oct (unpaid)
  // Unpaid elapsed dues: 01 Oct, 15 Oct, 22 Oct (3 items)
  assert.strictEqual(pendingWithGaps.length, 3)
  assert.strictEqual(pendingWithGaps[0].dueDate, '2026-10-01')
  assert.strictEqual(pendingWithGaps[1].dueDate, '2026-10-15')
  assert.strictEqual(pendingWithGaps[2].dueDate, '2026-10-22')

  // =========================================================================
  // 6. Test: Partial Payment
  // =========================================================================
  // EMI is 1250. Customer paid 500 towards 24 Sep due. Remaining 750 is pending.
  const mockPartialColls = [
    {
      id: 'c-part',
      loan_id: 'loan-test-a',
      customer_id: 'cust-1',
      worker_id: 'emp-1',
      amount_collected: 500,
      remaining_balance: 14500,
      collection_date: '2026-09-24',
      due_date: '2026-09-24',
      status: 'completed' as const,
      created_at: '2026-09-24T10:00:00Z',
    },
  ]
  const pendingPartial = getPendingDues(loanA, mockPartialColls, new Date('2026-09-25T10:00:00+05:30'))
  assert.strictEqual(pendingPartial.length, 1)
  assert.strictEqual(pendingPartial[0].dueDate, '2026-09-24')
  assert.strictEqual(pendingPartial[0].paid, 500)
  assert.strictEqual(pendingPartial[0].pending, 750)

  // =========================================================================
  // 7. Test: Advance Payment on upcoming installment
  // =========================================================================
  // On 01 Oct, customer pays in advance for 15 Oct due.
  const mockAdvanceColls = [
    {
      id: 'c-adv',
      loan_id: 'loan-test-a',
      customer_id: 'cust-1',
      worker_id: 'emp-1',
      amount_collected: 1250,
      remaining_balance: 13750,
      collection_date: '2026-10-01',
      due_date: '2026-10-15',
      status: 'completed' as const,
      created_at: '2026-10-01T10:00:00Z',
    },
  ]
  // In full schedule evaluated on 05 Oct (15 Oct is upcoming):
  const fullWithAdvance = getFullDueSchedule(loanA, mockAdvanceColls, [], new Date('2026-10-05T10:00:00+05:30'))
  const oct15Item = fullWithAdvance.find((s) => s.dueDate === '2026-10-15')
  assert.ok(oct15Item)
  assert.strictEqual(oct15Item?.status, 'Paid') // Marked Paid in advance, NOT pending!
  assert.strictEqual(oct15Item?.paid, 1250)

  // =========================================================================
  // 8. Test: After the last due date
  // =========================================================================
  // Today is 15 Jan 2027 (after loanA ends on 31 Dec 2026).
  // All 15 installments are elapsed and unpaid -> all 15 are overdue.
  const today15Jan = new Date('2027-01-15T10:00:00+05:30')
  const pendingAfterEnd = getPendingDues(loanA, [], today15Jan)
  assert.strictEqual(pendingAfterEnd.length, 15)
  assert.strictEqual(pendingAfterEnd.every((p) => p.status === 'overdue'), true)

  // =========================================================================
  // 9. Test: Loan with zero pending dues (All elapsed installments paid)
  // =========================================================================
  // Pay all 7 elapsed installments up to 05 Nov 2026:
  const mockAllPaidColls = scheduleA.slice(0, 7).map((d, i) => ({
    id: `c-all-${i}`,
    loan_id: 'loan-test-a',
    customer_id: 'cust-1',
    worker_id: 'emp-1',
    amount_collected: 1250,
    remaining_balance: 15000 - (i + 1) * 1250,
    collection_date: d,
    due_date: d,
    status: 'completed' as const,
    created_at: `${d}T10:00:00Z`,
  }))
  const pendingZero = getPendingDues(loanA, mockAllPaidColls, today05Nov)
  assert.strictEqual(pendingZero.length, 0) // Empty array: "No pending dues"

  // =========================================================================
  // 10. Test: isLoanDueInWeek
  // =========================================================================
  // Week 17 Sep 2026 (Mon 14 Sep - Sun 20 Sep):
  // Start date 17 Sep is reference date, first due is 24 Sep.
  // The loan is NOT due in week 14-20 Sep!
  const weekStart14Sep = new Date('2026-09-14T00:00:00+05:30')
  const weekEnd20Sep = new Date('2026-09-20T23:59:59+05:30')
  assert.strictEqual(isLoanDueInWeek(loanA, weekStart14Sep, weekEnd20Sep), false)

  // Week 21-27 Sep: Contains 24 Sep (Week 1 due date). Loan IS due!
  const weekStart21Sep = new Date('2026-09-21T00:00:00+05:30')
  const weekEnd27Sep = new Date('2026-09-27T23:59:59+05:30')
  assert.strictEqual(isLoanDueInWeek(loanA, weekStart21Sep, weekEnd27Sep), true)

  return true
}

if (require.main === module) {
  runDueScheduleTests()
  console.log('✅ ALL DUE SCHEDULE & PENDING DUES TESTS PASSED!')
}
