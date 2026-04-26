import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: 'admin' | 'staff'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          role?: 'admin' | 'staff'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'admin' | 'staff'
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          customer_id_display?: string
          name: string
          phone: string
          address: string
          created_at: string
          relationship?: string
          aadhaar_number?: string
          pan_number?: string
          additional_mobile_1?: string
          additional_mobile_1_relationship?: string
          additional_mobile_2?: string
          additional_mobile_2_relationship?: string
          is_verified?: boolean
        }
        Insert: {
          id?: string
          customer_id_display?: string
          name: string
          phone: string
          address: string
          created_at?: string
          relationship?: string
          aadhaar_number?: string
          pan_number?: string
          additional_mobile_1?: string
          additional_mobile_1_relationship?: string
          additional_mobile_2?: string
          additional_mobile_2_relationship?: string
          is_verified?: boolean
        }
        Update: {
          id?: string
          customer_id_display?: string
          name?: string
          phone?: string
          address?: string
          created_at?: string
          relationship?: string
          aadhaar_number?: string
          pan_number?: string
          additional_mobile_1?: string
          additional_mobile_1_relationship?: string
          additional_mobile_2?: string
          additional_mobile_2_relationship?: string
          is_verified?: boolean
        }
      }
      employees: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          designation: string
          department: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string
          designation?: string
          department?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          designation?: string
          department?: string
          created_at?: string
        }
      }
      loans: {
        Row: {
          id: string
          customer_id: string
          amount: number
          status: 'active' | 'closed' | 'pending'
          start_date: string
          end_date: string
          interest_rate: string
          number_of_weeks: number
          team_leader_id: string | null
          weekly_batch: 'tuesday' | 'thursday' | 'friday' | null
          loan_purpose: string | null
          customer_bank_name: string | null
          account_number: string | null
          ifsc_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          amount: number
          status?: 'active' | 'closed' | 'pending'
          start_date: string
          end_date: string
          interest_rate?: string
          number_of_weeks?: number
          team_leader_id?: string | null
          weekly_batch?: 'tuesday' | 'thursday' | 'friday' | null
          loan_purpose?: string | null
          customer_bank_name?: string | null
          account_number?: string | null
          ifsc_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          amount?: number
          status?: 'active' | 'closed' | 'pending'
          start_date?: string
          end_date?: string
          interest_rate?: string
          number_of_weeks?: number
          team_leader_id?: string | null
          weekly_batch?: 'tuesday' | 'thursday' | 'friday' | null
          loan_purpose?: string | null
          customer_bank_name?: string | null
          account_number?: string | null
          ifsc_code?: string | null
          created_at?: string
        }
      }
      collections: {
        Row: {
          id: string
          loan_id: string
          customer_id: string
          worker_id: string | null
          amount_collected: number
          remaining_balance: number
          collection_date: string
          status: 'completed' | 'partial' | 'pending'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          loan_id: string
          customer_id: string
          worker_id?: string | null
          amount_collected: number
          remaining_balance: number
          collection_date: string
          status?: 'completed' | 'partial' | 'pending'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          loan_id?: string
          customer_id?: string
          worker_id?: string | null
          amount_collected?: number
          remaining_balance?: number
          collection_date?: string
          status?: 'completed' | 'partial' | 'pending'
          notes?: string | null
          created_at?: string
        }
      }
      repayments: {
        Row: {
          id: string
          loan_id: string
          amount_paid: number
          payment_date: string
          payment_method: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          loan_id: string
          amount_paid: number
          payment_date: string
          payment_method?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          loan_id?: string
          amount_paid?: number
          payment_date?: string
          payment_method?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      batches: {
        Row: {
          id: string
          name: string
          batch_date: string
          total_collection: number
          customer_count: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          batch_date: string
          total_collection?: number
          customer_count?: number
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          batch_date?: string
          total_collection?: number
          customer_count?: number
          created_by?: string | null
          created_at?: string
        }
      }
      batch_customers: {
        Row: {
          id: string
          batch_id: string
          customer_id: string
          loan_id: string
          amount_paid: number
          balance: number
          status: 'paid' | 'partial' | 'unpaid'
          created_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          customer_id: string
          loan_id: string
          amount_paid?: number
          balance?: number
          status?: 'paid' | 'partial' | 'unpaid'
          created_at?: string
        }
        Update: {
          id?: string
          batch_id?: string
          customer_id?: string
          loan_id?: string
          amount_paid?: number
          balance?: number
          status?: 'paid' | 'partial' | 'unpaid'
          created_at?: string
        }
      }
    }
  }
}
