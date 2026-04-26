import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse'
import { Readable } from 'stream'
import * as XLSX from 'xlsx'

type JobRecord = {
  id: string
  status: 'pending' | 'running' | 'done' | 'error'
  processed: number
  total: number
  insertedCustomers: number
  insertedLoans: number
  insertedRepayments: number
  skipped: number
  errors: number
  errorRows: any[]
  error_message?: string
}

const globalAny: any = globalThis as any
if (!globalAny.__IMPORT_JOBS__) globalAny.__IMPORT_JOBS__ = new Map<string, JobRecord>()
const jobs: Map<string, JobRecord> = globalAny.__IMPORT_JOBS__

function normalizeHeader(h: string) {
  return h?.toString().trim().toLowerCase().replace(/\s+|\./g, '_')
}

function autoMapColumns(headers: string[]) {
  const map: Record<string, string> = {}
  const known: Record<string, string[]> = {
    customer_id: ['customer_id', 'id', 'customer_no'],
    customer_name: ['customer_name', 'name', 'borrower_name'],
    mobile: ['mobile_number', 'mobile', 'phone', 'phone_no'],
    relationship: ['relationship', 'relation'],
    aadhar: ['aadhar_number', 'aadhar', 'aadhaar', 'aadhaar_number'],
    pan: ['pan_number', 'pan', 'pan_card'],
    address: ['address', 'addr'],
    additional_mobile_1: ['additional_mobile_1', 'alt_mobile', 'alt_mobile_1'],
    additional_mobile_2: ['additionla_mobile_2', 'additional_mobile_2', 'alt_mobile_2'],
    loan_amount: ['loan_amount', 'amount', 'principal'],
    interest: ['interest_rate', 'interest'],
    weeks: ['number_of_weeks', 'weeks', 'tenure', 'duration_weeks'],
    team_leader: ['team_leader', 'leader', 'tl_name'],
    batch_day: ['weekly_batch', 'batch_day', 'collection_day'],
    start_date: ['start_date', 'loan_start', 'start'],
    end_date: ['end_date', 'loan_end', 'end'],
    bank_name: ['bank_name'],
    account_number: ['accound_number', 'account_number', 'account_no'],
    ifsc: ['ifsc_code', 'ifsc']
  }
  headers.forEach(h => {
    const n = normalizeHeader(h)
    for (const target in known) {
      if (known[target].includes(n)) {
        map[h] = target
        break
      }
    }
  })
  return map
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { path, delimiter = ',', hasHeader = true } = body || {}
    if (!path) return NextResponse.json({ error: 'Missing file path' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const jobId = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`
    jobs.set(jobId, { id: jobId, status: 'pending', processed: 0, total: 0, insertedCustomers: 0, insertedLoans: 0, insertedRepayments: 0, skipped: 0, errors: 0, errorRows: [] })

    ;(async () => {
      const job = jobs.get(jobId)!
      job.status = 'running'
      jobs.set(jobId, job)

      const { data: fileData, error: dlErr } = await admin.storage.from('MRGroups').download(path)
      if (dlErr || !fileData) {
        job.status = 'error'; job.error_message = dlErr?.message || 'Download failed'
        jobs.set(jobId, job); return
      }

      // Fetch employees for Team Leader mapping
      const { data: employees } = await admin.from('employees').select('id, name')
      const empNameToId = new Map((employees || []).map((e: any) => [e.name?.toLowerCase().trim(), e.id]))

      const toNumber = (v: any) => {
        if (v == null || v === '') return null
        const str = String(v)
        if (str.includes('E+') || str.includes('e+')) return Math.round(parseFloat(str))
        const n = Number(str.replace(/[^\d.-]/g, ''))
        return isNaN(n) ? null : n
      }
      
      const toDate = (v: any) => {
        if (!v) return null
        let s = String(v)
        if (s.includes('/')) { // MM/DD/YYYY
          const [m,d,y] = s.split('/')
          if (y) s = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
        }
        const d = new Date(s)
        return isNaN(d.getTime()) ? null : d.toISOString().slice(0,10)
      }

      const processChunk = async (chunkRows: any[]) => {
        if (!chunkRows.length) return;

        const normalized = chunkRows.map((r) => {
          const name = r.customer_name || r.name
          const phone = String(r.mobile || '').replace(/\D/g, '') || null
          return {
            _raw: r,
            customer_id_display: r.customer_id || null,
            name, phone,
            address: r.address || null,
            relationship: r.relationship || null,
            aadhaar: r.aadhar || null,
            pan: r.pan || null,
            additional_mobile_1: r.additional_mobile_1 || null,
            additional_mobile_2: r.additional_mobile_2 || null,
            
            amount: toNumber(r.loan_amount),
            interest: r.interest || null,
            weeks: toNumber(r.weeks),
            team_leader: r.team_leader || null, 
            batch_day: r.batch_day ? String(r.batch_day).toLowerCase() : null,
            startDate: toDate(r.start_date),
            endDate: toDate(r.end_date),
            bank_name: r.bank_name || null,
            account_number: r.account_number || null,
            ifsc: r.ifsc || null
          }
        })

        const valid: any[] = []
        for (const n of normalized) {
          if (!n.name || !n.phone || !n.amount || !n.weeks || !n.startDate) {
            job.skipped++; job.errorRows.push({ row: n._raw, reason: 'Missing required fields' })
          } else {
            valid.push(n)
          }
        }
        job.total += valid.length

        if (!valid.length) {
          jobs.set(jobId, job)
          return
        }

        const phoneToCustomer: Record<string, any> = {}
        for (const n of valid) {
          if (!phoneToCustomer[n.phone]) {
            phoneToCustomer[n.phone] = { 
              name: n.name, 
              phone: n.phone, 
              address: n.address, 
              customer_id_display: n.customer_id_display,
              relationship: n.relationship,
              aadhaar_number: n.aadhaar,
              pan_number: n.pan,
              additional_mobile_1: n.additional_mobile_1,
              additional_mobile_2: n.additional_mobile_2
            }
          }
        }
        const customers = Object.values(phoneToCustomer)

        const { data: custRows, error: custErr } = await admin
          .from('customers')
          .upsert(customers, { onConflict: 'phone' })
          .select('id, phone')
          
        if (custErr) {
          job.errors += customers.length
          job.error_message = custErr.message
          jobs.set(jobId, job)
          return
        }
        
        const phoneToId = new Map<string, string>((custRows || []).map((c: any) => [c.phone, c.id]))

        const loans = valid.map(n => ({
          customer_id: phoneToId.get(n.phone),
          amount: n.amount,
          status: 'pending',
          start_date: n.startDate,
          end_date: n.endDate || n.startDate,
          interest_rate: String(n.interest || '8.33'),
          number_of_weeks: n.weeks,
          weekly_batch: ['tuesday', 'thursday', 'friday'].includes(n.batch_day) ? n.batch_day : null,
          team_leader_id: n.team_leader ? empNameToId.get(n.team_leader.toString().toLowerCase().trim()) || null : null,
          customer_bank_name: n.bank_name,
          account_number: n.account_number,
          ifsc_code: n.ifsc
        })).filter(l => !!l.customer_id)

        if (loans.length) {
          const { error: loanErr } = await admin
            .from('loans')
            .insert(loans)
          if (loanErr) {
            job.errors += loans.length
            job.error_message = loanErr.message
          } else {
            job.insertedLoans += loans.length
            job.insertedCustomers += customers.length
          }
        }

        job.processed += valid.length
        jobs.set(jobId, job)
      }

      const name = path.toLowerCase()
      try {
        if (name.endsWith('.xlsx')) {
          const buf = await fileData.arrayBuffer()
          const wb = XLSX.read(buf, { type: 'array' })
          const sheet = wb.Sheets[wb.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][]
          if (!json.length) throw new Error('Empty sheet')
          
          const headers = (json.shift() || []).map((h: any) => String(h))
          const mapping = autoMapColumns(headers)
          
          const rows: any[] = []
          json.forEach(r => {
            const obj: any = {}
            headers.forEach((h, idx) => { obj[mapping[h] || normalizeHeader(h)] = r[idx] })
            rows.push(obj)
          })

          const chunkSize = 200
          for (let i = 0; i < rows.length; i += chunkSize) {
            await processChunk(rows.slice(i, i + chunkSize))
          }
        } else {
          // CSV Parser
          const buf = await fileData.arrayBuffer()
          const parser = parse({
            bom: true,
            columns: hasHeader ? true : false,
            delimiter: delimiter === 'tab' ? '\t' : delimiter,
            skip_empty_lines: true,
            trim: true
          })
          parser.write(Buffer.from(buf))
          parser.end()

          let chunkRowBatch: any[] = []
          if (hasHeader) {
            let headerKeys: string[] | null = null
            let mapping: Record<string, string> = {}
            for await (const record of parser) {
              if (!headerKeys) {
                headerKeys = Object.keys(record)
                mapping = autoMapColumns(headerKeys)
              }
              const obj: any = {}
              headerKeys!.forEach((k) => { obj[mapping[k] || normalizeHeader(k)] = record[k] })
              chunkRowBatch.push(obj)

              if (chunkRowBatch.length >= 200) {
                await processChunk(chunkRowBatch)
                chunkRowBatch = []
              }
            }
          } else {
            for await (const record of parser) {
              const arr = record as any[]
              const obj: any = {}
              arr.forEach((val, idx) => { obj[`col_${idx}`] = val })
              chunkRowBatch.push(obj)

              if (chunkRowBatch.length >= 200) {
                await processChunk(chunkRowBatch)
                chunkRowBatch = []
              }
            }
          }

          if (chunkRowBatch.length > 0) {
            await processChunk(chunkRowBatch)
          }
        }
      } catch (e) {
        job.status = 'error'; job.error_message = (e as any)?.message || 'Parse error'
        jobs.set(jobId, job); return
      }

      if (job.total === 0 && (job.status as string) !== 'error') {
        job.status = 'error'; job.error_message = 'No valid rows parsed from file'
        jobs.set(jobId, job); return
      }

      job.status = 'done'
      jobs.set(jobId, job)
    })()

    return NextResponse.json({ success: true, jobId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
