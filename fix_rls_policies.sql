-- =====================================================
-- FIX RLS POLICIES FOR EMERGENCY_LOANS AND CLOSED_LOANS
-- Run this in Supabase SQL Editor to fix the RLS issue
-- =====================================================

-- Drop ALL existing policies using a loop (more reliable)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'emergency_loans' AND schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON emergency_loans';
    END LOOP;
END $$;

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'closed_loans' AND schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON closed_loans';
    END LOOP;
END $$;

-- Create separate policies for emergency_loans
CREATE POLICY "Allow all SELECT on emergency_loans" 
    ON emergency_loans FOR SELECT USING (true);

CREATE POLICY "Allow all INSERT on emergency_loans" 
    ON emergency_loans FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all UPDATE on emergency_loans" 
    ON emergency_loans FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all DELETE on emergency_loans" 
    ON emergency_loans FOR DELETE USING (true);

-- Create separate policies for closed_loans
CREATE POLICY "Allow all SELECT on closed_loans" 
    ON closed_loans FOR SELECT USING (true);

CREATE POLICY "Allow all INSERT on closed_loans" 
    ON closed_loans FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all UPDATE on closed_loans" 
    ON closed_loans FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all DELETE on closed_loans" 
    ON closed_loans FOR DELETE USING (true);

