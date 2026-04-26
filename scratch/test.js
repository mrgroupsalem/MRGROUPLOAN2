const fs = require('fs');
const { parse } = require('csv-parse/sync');

function normalizeHeader(h) {
  return h?.toString().trim().toLowerCase().replace(/\s+|\./g, '_')
}

function autoMapColumns(headers) {
  const map = {}
  const known = {
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

const toNumber = (v) => {
  if (v == null || v === '') return null
  const str = String(v)
  if (str.includes('E+') || str.includes('e+')) return Math.round(parseFloat(str))
  const n = Number(str.replace(/[^\d.-]/g, ''))
  return isNaN(n) ? null : n
}

const toDate = (v) => {
  if (!v) return null
  let s = String(v)
  if (s.includes('/')) { // MM/DD/YYYY
    const [m,d,y] = s.split('/')
    if (y) s = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0,10)
}

const content = fs.readFileSync('sample_import_format.csv');
const records = parse(content, {
  bom: true,
  columns: true,
  skip_empty_lines: true,
  trim: true
});

let headerKeys = Object.keys(records[0] || {});
let mapping = autoMapColumns(headerKeys);

const mappedRecords = records.map(record => {
  const obj = {};
  headerKeys.forEach(k => {
    obj[mapping[k] || normalizeHeader(k)] = record[k];
  });
  return obj;
});

const normalized = mappedRecords.map((r) => {
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
});

normalized.forEach((n, idx) => {
  if (!n.name || !n.phone || !n.amount || !n.weeks || !n.startDate) {
    console.log(`Row ${idx + 1} SKIP: Missing required fields`, {
      name: !!n.name,
      phone: !!n.phone,
      amount: !!n.amount,
      weeks: !!n.weeks,
      startDate: !!n.startDate
    });
    console.log('Row object:', n);
  } else {
    console.log(`Row ${idx + 1} VALID`);
  }
});
