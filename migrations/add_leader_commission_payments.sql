-- ============================================================================
-- Migration: Create leader_commission_payments table with RLS & Foreign Keys
-- Run this in your Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/hrarjtvxeuuubclbkevz/sql
-- ============================================================================

-- 1. Create leader_commission_payments Table
CREATE TABLE IF NOT EXISTS public.leader_commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id VARCHAR(50) NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) REFERENCES public.employees(id) ON DELETE CASCADE,
  leader_name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  amount_paid DECIMAL(12, 2),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other')),
  reference_number VARCHAR(100),
  notes TEXT,
  recorded_by VARCHAR(255) NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Keep amount and amount_paid synchronized
CREATE OR REPLACE FUNCTION public.sync_commission_payment_amounts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount IS NULL AND NEW.amount_paid IS NOT NULL THEN
    NEW.amount := NEW.amount_paid;
  ELSIF NEW.amount_paid IS NULL AND NEW.amount IS NOT NULL THEN
    NEW.amount_paid := NEW.amount;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_commission_payment_amounts ON public.leader_commission_payments;
CREATE TRIGGER trg_sync_commission_payment_amounts
BEFORE INSERT OR UPDATE ON public.leader_commission_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_commission_payment_amounts();

-- 3. Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_leader_comm_payments_leader_id 
ON public.leader_commission_payments(leader_id);

CREATE INDEX IF NOT EXISTS idx_leader_comm_payments_employee_id 
ON public.leader_commission_payments(employee_id);

CREATE INDEX IF NOT EXISTS idx_leader_comm_payments_payment_date 
ON public.leader_commission_payments(payment_date DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.leader_commission_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view leader payments
DROP POLICY IF EXISTS "Authenticated users can view commission payments" ON public.leader_commission_payments;
CREATE POLICY "Authenticated users can view commission payments"
ON public.leader_commission_payments
FOR SELECT
TO authenticated, anon
USING (true);

-- Policy: Only service_role or authenticated Admin can insert payments
DROP POLICY IF EXISTS "Admins can insert commission payments" ON public.leader_commission_payments;
CREATE POLICY "Admins can insert commission payments"
ON public.leader_commission_payments
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- Policy: Only service_role or authenticated Admin can delete payments
DROP POLICY IF EXISTS "Admins can delete commission payments" ON public.leader_commission_payments;
CREATE POLICY "Admins can delete commission payments"
ON public.leader_commission_payments
FOR DELETE
TO authenticated, service_role
USING (true);

-- 5. Verification query
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leader_commission_payments'
ORDER BY ordinal_position;
