import { NextResponse } from 'next/server'

const globalAny: any = globalThis as any
if (!globalAny.__IMPORT_JOBS__) globalAny.__IMPORT_JOBS__ = new Map<string, any>()
const jobs: Map<string, any> = globalAny.__IMPORT_JOBS__

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const job = jobs.get(params.id)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  return NextResponse.json({
    done: job.status === 'done' || job.status === 'error',
    status: job.status,
    processed: job.processed,
    total: job.total,
    insertedCustomers: job.insertedCustomers,
    insertedLoans: job.insertedLoans,
    insertedRepayments: job.insertedRepayments,
    skipped: job.skipped,
    errors: job.errors,
    error_message: job.error_message
  })
}
