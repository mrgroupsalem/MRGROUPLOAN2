export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff'
  created_at: string
}

export interface Employee {
  id: string
  name: string
  email?: string
  leader_id?: string
  phone: string
  designation: string
  department: string
  created_at: string
}

export interface Customer {
  id: string
  // User-provided readable ID to display instead of DB id
  customer_id_display?: string
  name: string
  phone: string
  address: string
  created_at: string
  // Enhanced fields
  relationship?: 'Husband' | 'Wife' | 'Mother' | 'Father' | 'Daughter' | 'Son' | 'Brother' | 'Sister' | 'Other'
  aadhaar_number?: string
  pan_number?: string
  additional_mobile_1?: string
  additional_mobile_1_name?: string
  additional_mobile_1_relationship?: 'Husband' | 'Wife' | 'Mother' | 'Father' | 'Daughter' | 'Son' | 'Brother' | 'Sister' | 'Other'
  additional_mobile_2?: string
  additional_mobile_2_name?: string
  additional_mobile_2_relationship?: 'Husband' | 'Wife' | 'Mother' | 'Father' | 'Daughter' | 'Son' | 'Brother' | 'Sister' | 'Other'
  is_verified?: boolean
  is_mobile_verified?: boolean
  latitude?: number
  longitude?: number
  // Photo URL from Supabase Storage
  photo_url?: string
}

export interface Loan {
  id: string
  loan_id_display?: string
  customer_id: string
  customer?: Customer
  amount: number
  status: 'active' | 'closed' | 'pending'
  start_date: string
  end_date: string
  photo_url?: string
  created_at: string
  // Enhanced fields
  loan_purpose?: string
  team_leader_id?: string
  team_leader?: Employee
  number_of_members?: number
  number_of_weeks?: number
  customer_bank_name?: string
  account_number?: string
  ifsc_code?: string
  weekly_batch?: 'tuesday' | 'thursday' | 'friday'
  interest_rate?: string
  previous_loan_id?: string
  renewed_at?: string
  renewal_notes?: string
}

export interface Repayment {
  id: string
  loan_id: string
  loan?: Loan
  amount_paid: number
  date: string
  created_at: string
}

export interface Collection {
  id: string
  loan_id: string
  customer_id: string
  worker_id: string
  amount_collected: number
  remaining_balance: number
  collection_date: string
  due_date?: string
  status: 'completed' | 'partial' | 'pending'
  notes?: string
  created_at: string
  customer?: Customer
  loan?: Loan
  worker?: Employee
}

export interface Batch {
  id: string
  name: string
  date: string
  total_collection: number
  customer_count: number
  created_at: string
}

export interface BatchCustomer {
  id: string
  batch_id: string
  customer_id: string
  loan_id: string
  customer?: Customer
  loan?: Loan
  amount_paid: number
  balance: number
  status: 'paid' | 'partial' | 'unpaid'
}

export interface DashboardStats {
  newLoans: number
  activeLoans: number
  closedLoans: number
  openLoanApplications: number
  newLoanApplications: number
  totalSanctionedAmount: number
  applicantsWithUnpaidShortfall: number
  totalShortfallAmount: number
  todayCollection: number
  totalDisbursed: number
  activeSecurities: number
  totalWriteOff: number
  totalRepayment: number
  todayProfit?: number
  totalProfit?: number
  totalOutstandingBalance?: number
  activeCustomers?: number
}

export interface ChartData {
  date: string
  value: number
  amount?: number
}

export interface WeeklyBatch {
  id: string
  day: 'tuesday' | 'thursday' | 'friday'
  name: string
  total_collection: number
  customer_count: number
  target_amount: number
  completion_percentage: number
  last_collection_date: string
  next_collection_date: string
  status: 'active' | 'completed' | 'pending'
}

export interface WeeklyBatchCustomer {
  id: string
  batch_id: string
  customer_id: string
  loan_id: string
  customer?: Customer
  loan?: Loan
  amount_paid: number
  balance: number
  status: 'active' | 'closed' | 'pending'
  payment_date: string
  notes?: string
  // New fields for enhanced batch details
  customer_id_display?: string
  follow_worker?: Employee
  customer_name?: string
  loan_amount?: number
  tenure_weeks?: number
  interest_rate?: number
  emi_amount?: number
  paid_amount_current?: number
  start_date?: string
  closing_date?: string
  weeks_completed?: number
  paid_amount_weeks?: number
  balance_amount?: number
  profit_amount?: number
}
export interface LeaderCommissionPayment {
  id: string
  leader_id: string
  employee_id?: string
  leader_name: string
  amount?: number
  amount_paid: number
  payment_date: string
  payment_method?: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | string
  reference_number?: string
  notes?: string
  recorded_by?: string
  created_at: string
  updated_at?: string
}
