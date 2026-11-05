-- ============================================================================
-- Migration: Remove disbursement_date from loans table
-- Author: MR Groups Engineering
-- Target Table: public.loans
-- Goal: Completely remove disbursement_date column from the database.
-- Note: Start Date and End Date are already populated and remain intact.
-- ============================================================================

-- UP MIGRATION (Execute to drop column):
-- ----------------------------------------------------------------------------
-- 1. Drop index if exists
DROP INDEX IF EXISTS idx_loans_disbursement_date;

-- 2. Drop the column from loans table
ALTER TABLE public.loans 
DROP COLUMN IF EXISTS disbursement_date;


-- DOWN MIGRATION (Rollback / Revert if ever needed):
-- ----------------------------------------------------------------------------
-- ALTER TABLE public.loans 
-- ADD COLUMN IF NOT EXISTS disbursement_date DATE;
--
-- CREATE INDEX IF NOT EXISTS idx_loans_disbursement_date 
-- ON public.loans(disbursement_date);

