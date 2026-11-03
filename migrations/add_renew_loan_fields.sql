-- Migration: Add renewal tracking fields to loans table
-- Run this in Supabase SQL Editor if you wish to store renewal references directly on loans

-- Add previous_loan_id column referencing the previous loan
ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS previous_loan_id UUID REFERENCES loans(id),
  ADD COLUMN IF NOT EXISTS renewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewal_notes TEXT;

-- Create index for fast lookups of loan renewal chains
CREATE INDEX IF NOT EXISTS idx_loans_previous_loan_id ON loans(previous_loan_id);
CREATE INDEX IF NOT EXISTS idx_loans_customer_id ON loans(customer_id);

-- Verify columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'loans'
  AND column_name IN ('previous_loan_id', 'renewed_at', 'renewal_notes')
ORDER BY column_name;

