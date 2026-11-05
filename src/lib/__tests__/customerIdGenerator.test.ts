import assert from 'assert'
import {
  extractTeamLeaderCode,
  generateCustomerId,
} from '../customerIdGenerator'

export function runCustomerIdGeneratorTests() {
  console.log('Running Customer ID Generator Test Suite (Leader Customer Count Logic)...')

  // =========================================================================
  // 1. Team Leader Code Extraction
  // =========================================================================
  assert.strictEqual(
    extractTeamLeaderCode({ id: 'emp-1', name: 'RANI 477', email: 'rani@test.com' } as any),
    '477',
    'Should extract 477 from name "RANI 477"'
  )

  assert.strictEqual(
    extractTeamLeaderCode({ id: 'emp-2', name: 'NANDINI DURAISAMY 475', email: 'nandini@test.com' } as any),
    '475',
    'Should extract 475 from name "NANDINI DURAISAMY 475"'
  )

  assert.strictEqual(
    extractTeamLeaderCode({ id: 'emp-3', name: 'Sornambigai', email: 'sorna492@gmail.com' } as any),
    '492',
    'Should extract 492 from email "sorna492@gmail.com"'
  )

  assert.strictEqual(
    extractTeamLeaderCode({ id: 'emp-4', name: 'Santhi (421)', email: 'santhi@test.com' } as any),
    '421',
    'Should extract 421 from name with parentheses "Santhi (421)"'
  )

  assert.strictEqual(
    extractTeamLeaderCode({ id: 'emp-5', name: 'Leader Name', leader_id: 'TL477' } as any),
    '477',
    'Should extract 477 from leader_id "TL477"'
  )

  // =========================================================================
  // 2. REQUIRED LOGIC EXAMPLES (Must Pass)
  // =========================================================================
  // Example 1: RANI 477 has 14 customers, today Nov 2026 → 4772611015
  const nov2026 = new Date('2026-11-05T12:00:00+05:30')
  const res1 = generateCustomerId('477', nov2026, 14)
  assert.strictEqual(
    res1.customerId,
    '4772611015',
    'Example 1 Failed: RANI 477 with 14 customers in Nov 2026 must produce 4772611015'
  )
  assert.strictEqual(res1.sequenceStr, '015')
  assert.strictEqual(res1.runningNumber, 15)

  // Example 2: RANI 477 has 14 customers, in Jan 2027 → 4772701015
  // The last 3 digits must NEVER depend on month or year! Only YY and MM change.
  const jan2027 = new Date('2027-01-15T12:00:00+05:30')
  const res2 = generateCustomerId('477', jan2027, 14)
  assert.strictEqual(
    res2.customerId,
    '4772701015',
    'Example 2 Failed: RANI 477 with 14 customers in Jan 2027 must produce 4772701015'
  )
  assert.strictEqual(res2.sequenceStr, '015')
  assert.strictEqual(res2.runningNumber, 15)

  // Example 3: Leader with 0 customers → ...001
  const res3 = generateCustomerId('477', nov2026, 0)
  assert.strictEqual(
    res3.customerId,
    '4772611001',
    'Example 3 Failed: Leader with 0 customers must produce running number 001'
  )
  assert.strictEqual(res3.sequenceStr, '001')

  // Example 4: Leader with 99 customers → ...100
  const res4 = generateCustomerId('477', nov2026, 99)
  assert.strictEqual(
    res4.customerId,
    '4772611100',
    'Example 4 Failed: Leader with 99 customers must produce running number 100'
  )
  assert.strictEqual(res4.sequenceStr, '100')
  assert.strictEqual(res4.runningNumber, 100)

  // =========================================================================
  // 3. Duplicate Safety Simulation (Taken ID skips to next free number)
  // =========================================================================
  const existingIds = new Set<string>(['4772611015', '4772611016'])
  let count = 14
  let candidate = generateCustomerId('477', nov2026, count)
  while (existingIds.has(candidate.customerId)) {
    count++
    candidate = generateCustomerId('477', nov2026, count)
  }
  assert.strictEqual(
    candidate.customerId,
    '4772611017',
    'Duplicate Safety Failed: When 015 and 016 exist, should advance to 017'
  )

  // =========================================================================
  // 4. Distinct Customer Counting Simulation (Customer with 2 loans counted once)
  // =========================================================================
  const loanRows = [
    { customer_id: 'CUST-001', team_leader_id: 'TL-1' },
    { customer_id: 'CUST-001', team_leader_id: 'TL-1' }, // 2nd loan for CUST-001
    { customer_id: 'CUST-002', team_leader_id: 'TL-1' },
    { customer_id: 'CUST-003', team_leader_id: 'TL-1' },
  ]
  const uniqueCusts = new Set(loanRows.map((r) => r.customer_id))
  assert.strictEqual(uniqueCusts.size, 3, 'Customer with 2 loans must be counted exactly once')
  const resDistinct = generateCustomerId('477', nov2026, uniqueCusts.size)
  assert.strictEqual(
    resDistinct.customerId,
    '4772611004',
    'Next customer for 3 distinct customers must be 004'
  )

  console.log('✅ ALL Customer ID Generator tests passed successfully!')
}

if (require.main === module) {
  runCustomerIdGeneratorTests()
}
