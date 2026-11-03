import assert from 'assert'
import {
  getFirstDueDate,
  generateDueSchedule,
  formatDisbursementDate,
  formatDueDate,
  isLoanDueInWeek,
} from '../dueSchedule'

export function runDueScheduleTests() {
  // Example 1: Disbursed Tuesday 03/11/2026, batch Tuesday -> first due Tuesday 10/11/2026
  assert.strictEqual(getFirstDueDate('2026-11-03', 'tuesday'), '2026-11-10')

  // Example 2: Disbursed Wednesday 04/11/2026, batch Friday -> first due Friday 13/11/2026
  assert.strictEqual(getFirstDueDate('2026-11-04', 'friday'), '2026-11-13')

  // Example 3: Disbursed Monday 09/11/2026, batch Thursday -> first due Thursday 19/11/2026
  assert.strictEqual(getFirstDueDate('2026-11-09', 'thursday'), '2026-11-19')

  // Example 4: Disbursed Friday 06/11/2026, batch Tuesday -> first due Tuesday 10/11/2026
  assert.strictEqual(getFirstDueDate('2026-11-06', 'tuesday'), '2026-11-10')

  // Example 5: Disbursed Sunday 08/11/2026, batch Thursday -> first due Thursday 12/11/2026
  assert.strictEqual(getFirstDueDate('2026-11-08', 'thursday'), '2026-11-12')

  // Edge Case: Year-end transition
  assert.strictEqual(getFirstDueDate('2026-12-30', 'tuesday'), '2027-01-05')

  // Edge Case: Schedule generation produces 15 dates spaced by 7 days
  const schedule = generateDueSchedule('2026-11-04', 'friday', 15)
  assert.strictEqual(schedule.length, 15)
  assert.strictEqual(schedule[0], '2026-11-13')
  assert.strictEqual(schedule[1], '2026-11-20')
  assert.strictEqual(schedule[14], '2027-02-19')

  // Formatting tests
  assert.strictEqual(formatDisbursementDate(null), 'Not recorded')
  assert.strictEqual(formatDisbursementDate(''), 'Not recorded')
  assert.ok(formatDisbursementDate('2026-11-04').includes('Nov 2026'))

  return true
}

if (require.main === module) {
  runDueScheduleTests()
  console.log('All dueSchedule tests passed successfully.')
}
