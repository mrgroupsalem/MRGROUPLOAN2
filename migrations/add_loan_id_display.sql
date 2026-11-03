-- Migration: Add Admin-Created Loan ID display field to loans table
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/hrarjtvxeuuubclbkevz/sql

-- 1. Add loan_id_display column to loans table if it doesn't already exist
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS loan_id_display VARCHAR(50);

-- 2. Create index for fast lookups by loan_id_display
CREATE INDEX IF NOT EXISTS idx_loans_loan_id_display 
ON loans(loan_id_display);

-- 3. Backfill existing loans with Admin-Created Loan IDs (LN-<leader_code>-<seq>)
DO $$
DECLARE
  rec RECORD;
  tl_code TEXT;
  seq INT;
  leader_seqs JSONB := '{}'::jsonb;
BEGIN
  -- Iterate through all existing loans ordered by creation time
  FOR rec IN 
    SELECT 
      l.id, 
      l.created_at, 
      l.team_leader_id, 
      c.customer_id_display,
      e.name AS emp_name, 
      e.email AS emp_email
    FROM loans l
    LEFT JOIN customers c ON l.customer_id = c.id
    LEFT JOIN employees e ON l.team_leader_id = e.id
    ORDER BY l.created_at ASC
  LOOP
    -- Extract 3-digit leader code from customer display ID, employee name, or email
    IF rec.customer_id_display IS NOT NULL AND length(rec.customer_id_display) >= 3 THEN
      tl_code := substring(rec.customer_id_display from 1 for 3);
    ELSIF rec.emp_name IS NOT NULL AND rec.emp_name ~ '\m(\d{3})\M' THEN
      tl_code := substring(rec.emp_name from '\m(\d{3})\M');
    ELSIF rec.emp_email IS NOT NULL AND rec.emp_email ~ '(\d{3})' THEN
      tl_code := substring(rec.emp_email from '(\d{3})');
    ELSE
      tl_code := '100';
    END IF;

    -- Track sequential count per leader
    seq := COALESCE((leader_seqs->>tl_code)::INT, 0) + 1;
    leader_seqs := jsonb_set(leader_seqs, ARRAY[tl_code], to_jsonb(seq));

    -- Update loan with Admin Loan ID e.g. LN-475-001, LN-492-001
    UPDATE loans 
    SET loan_id_display = 'LN-' || tl_code || '-' || LPAD(seq::TEXT, 3, '0')
    WHERE id = rec.id AND (loan_id_display IS NULL OR loan_id_display = '');
  END LOOP;
END $$;

-- 4. Verify backfill results
SELECT 
  id, 
  loan_id_display, 
  amount, 
  status, 
  created_at 
FROM loans 
ORDER BY created_at ASC;

