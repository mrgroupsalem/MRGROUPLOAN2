-- =====================================================
-- FIX TEAM_LEADER_ID TYPE MISMATCH
-- Run this if you already created the tables with wrong type
-- =====================================================

-- Drop existing tables if they exist (WARNING: This will delete all data!)
DROP TABLE IF EXISTS emergency_loans CASCADE;
DROP TABLE IF EXISTS closed_loans CASCADE;

-- Now run the corrected create_emergency_closed_loan_tables.sql script

