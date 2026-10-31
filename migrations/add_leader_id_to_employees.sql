-- Migration: Add leader_id to employees table
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/hrarjtvxeuuubclbkevz/sql)

-- 1. Add leader_id column to employees table if it does not exist
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS leader_id VARCHAR(10);

-- 2. Ensure email column is nullable so email is not required
ALTER TABLE employees
  ALTER COLUMN email DROP NOT NULL;

-- 3. Safely backfill leader_id for existing employees from their name or email
UPDATE employees
SET leader_id = (regexp_matches(name, '\d{3}'))[1]
WHERE leader_id IS NULL AND name ~ '\d{3}';

UPDATE employees
SET leader_id = (regexp_matches(email, '\d{3}'))[1]
WHERE leader_id IS NULL AND email ~ '\d{3}';

-- 4. Ensure uniqueness constraint on leader_id for non-null values
CREATE UNIQUE INDEX IF NOT EXISTS employees_leader_id_idx 
ON employees (leader_id) 
WHERE leader_id IS NOT NULL;

-- 5. Verification query
SELECT id, name, leader_id, phone, designation, department, email
FROM employees;

