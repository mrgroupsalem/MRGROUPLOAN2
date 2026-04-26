-- ============================================
-- MR Groups Loan Management System
-- Complete Database Schema for Supabase
-- ============================================
-- Version: 2026-03-11
-- Includes: Photo Upload Support, Emergency Loans, Collections
-- Run this in: Supabase Dashboard → SQL Editor

-- ============================================
-- PART 1: EXTENSIONS & SETUP
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PART 2: CORE TABLES
-- ============================================

-- Users table (authentication & roles)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Employees table (workers & team leaders)
-- IMPORTANT: IDs are custom strings like 'TL001', 'TL002', etc.
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    designation VARCHAR(100),
    department VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_employees_email UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);

-- Customers table (with photo upload support)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id_display VARCHAR(32),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    relationship VARCHAR(24),
    aadhaar_number VARCHAR(20),
    pan_number VARCHAR(15),
    additional_mobile_1 VARCHAR(20),
    additional_mobile_1_relationship VARCHAR(24),
    additional_mobile_2 VARCHAR(20),
    additional_mobile_2_relationship VARCHAR(24),
    photo_url TEXT,  -- PHOTO UPLOAD SUPPORT - Stores Supabase Storage URL
    is_verified BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customers_phone UNIQUE (phone),
    CONSTRAINT uq_customers_display_id UNIQUE (customer_id_display)
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_aadhaar ON customers(aadhaar_number);
CREATE INDEX IF NOT EXISTS idx_customers_pan ON customers(pan_number);

-- ============================================
-- PART 3: LOAN TABLES
-- ============================================

-- Regular Loans table
DROP TABLE IF EXISTS loans CASCADE;
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'pending')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    interest_rate VARCHAR(20) DEFAULT '8.33',  -- VARCHAR to match app code
    number_of_weeks INTEGER DEFAULT 15,
    team_leader_id VARCHAR(32) REFERENCES employees(id) ON DELETE SET NULL,
    weekly_batch VARCHAR(20) CHECK (weekly_batch IN ('tuesday', 'thursday', 'friday')),
    loan_purpose TEXT,
    customer_bank_name VARCHAR(255),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    photo_url TEXT,  -- PHOTO UPLOAD SUPPORT - Auto-copied from customer
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loans_customer ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_start_date ON loans(start_date);
CREATE INDEX IF NOT EXISTS idx_loans_team_leader ON loans(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_loans_weekly_batch ON loans(weekly_batch);
CREATE INDEX IF NOT EXISTS idx_loans_photo ON loans(photo_url);  -- Index for photo lookups

-- Emergency Loans table (short-term emergency loans)
DROP TABLE IF EXISTS emergency_loans CASCADE;
CREATE TABLE emergency_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    address TEXT,
    additional_mobile_1 VARCHAR(20),
    additional_mobile_1_relationship VARCHAR(50),
    additional_mobile_2 VARCHAR(20),
    additional_mobile_2_relationship VARCHAR(50),
    team_leader_id VARCHAR(32) REFERENCES employees(id) ON DELETE SET NULL,
    loan_amount NUMERIC(12,2) NOT NULL,
    due_amount NUMERIC(12,2) NOT NULL,
    number_of_days INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    photo_url TEXT,  -- PHOTO UPLOAD SUPPORT - Auto-copied from customer
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emergency_loans_customer ON emergency_loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_emergency_loans_mobile ON emergency_loans(mobile_number);
CREATE INDEX IF NOT EXISTS idx_emergency_loans_status ON emergency_loans(status);
CREATE INDEX IF NOT EXISTS idx_emergency_loans_team_leader ON emergency_loans(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_emergency_loans_photo ON emergency_loans(photo_url);  -- Index for photo lookups

-- ============================================
-- PART 4: COLLECTIONS & REPAYMENTS
-- ============================================

-- Collections table (daily collection tracking)
DROP TABLE IF EXISTS collections CASCADE;
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    worker_id VARCHAR(32) REFERENCES employees(id) ON DELETE SET NULL,
    amount_collected NUMERIC(12,2) NOT NULL CHECK (amount_collected >= 0),
    remaining_balance NUMERIC(12,2) NOT NULL CHECK (remaining_balance >= 0),
    collection_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'pending')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collections_loan ON collections(loan_id);
CREATE INDEX IF NOT EXISTS idx_collections_customer ON collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_collections_worker ON collections(worker_id);
CREATE INDEX IF NOT EXISTS idx_collections_date ON collections(collection_date);

-- Emergency Collections table
DROP TABLE IF EXISTS emergency_collections CASCADE;
CREATE TABLE emergency_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_loan_id UUID NOT NULL REFERENCES emergency_loans(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    worker_id VARCHAR(32) REFERENCES employees(id) ON DELETE SET NULL,
    amount_collected NUMERIC(12,2) NOT NULL,
    remaining_balance NUMERIC(12,2) NOT NULL,
    collection_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'pending')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emergency_collections_loan ON emergency_collections(emergency_loan_id);
CREATE INDEX IF NOT EXISTS idx_emergency_collections_customer ON emergency_collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_emergency_collections_worker ON emergency_collections(worker_id);
CREATE INDEX IF NOT EXISTS idx_emergency_collections_date ON emergency_collections(collection_date);

-- Repayments table (optional detailed payment log)
CREATE TABLE IF NOT EXISTS repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount_paid NUMERIC(12,2) NOT NULL CHECK (amount_paid > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_repayments_loan ON repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_repayments_date ON repayments(payment_date);

-- ============================================
-- PART 5: BATCH MANAGEMENT
-- ============================================

-- Batches table (weekly collection groups)
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    batch_date DATE NOT NULL,
    total_collection NUMERIC(12,2) NOT NULL DEFAULT 0,
    customer_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_batches_date ON batches(batch_date);

-- Batch-Customers table (many-to-many relationship)
DROP TABLE IF EXISTS batch_customers CASCADE;
CREATE TABLE batch_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'partial', 'unpaid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_batch_customer UNIQUE (batch_id, customer_id, loan_id)
);
CREATE INDEX IF NOT EXISTS idx_batch_customers_batch ON batch_customers(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_customers_customer ON batch_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_batch_customers_loan ON batch_customers(loan_id);

-- Pending Customers tracker (for dashboard workflow)
CREATE TABLE IF NOT EXISTS pending_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    pending_count INTEGER NOT NULL DEFAULT 0,
    emi_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    checked BOOLEAN NOT NULL DEFAULT FALSE,
    checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pending_customers_loan UNIQUE (loan_id)
);
CREATE INDEX IF NOT EXISTS idx_pending_customers_checked ON pending_customers(checked);
CREATE INDEX IF NOT EXISTS idx_pending_customers_loan ON pending_customers(loan_id);

-- Collected Customers log (for marked collected actions)
CREATE TABLE IF NOT EXISTS collected_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    worker_id VARCHAR(32) REFERENCES employees(id) ON DELETE SET NULL,
    amount_collected NUMERIC(12,2) NOT NULL DEFAULT 0,
    collection_date DATE NOT NULL DEFAULT (NOW()::DATE),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collected_customers_loan ON collected_customers(loan_id);
CREATE INDEX IF NOT EXISTS idx_collected_customers_customer ON collected_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_collected_customers_date ON collected_customers(collection_date);

-- ============================================
-- PART 6: TRIGGERS & FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-copy photo_url from customer to loans
CREATE OR REPLACE FUNCTION copy_customer_photo_to_loan()
RETURNS TRIGGER AS $$
BEGIN
    -- When a loan is inserted or updated, copy photo_url from customer
    IF NEW.customer_id IS NOT NULL THEN
        SELECT photo_url INTO NEW.photo_url
        FROM customers
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-copy photo on loan INSERT/UPDATE
CREATE TRIGGER auto_copy_photo_on_loan_change
    BEFORE INSERT OR UPDATE OF customer_id ON loans
    FOR EACH ROW
    EXECUTE FUNCTION copy_customer_photo_to_loan();

-- Function to sync photo_url when customer photo changes
CREATE OR REPLACE FUNCTION sync_customer_photo_to_loans()
RETURNS TRIGGER AS $$
BEGIN
    -- When customer photo_url changes, update all their loans
    IF OLD.photo_url IS DISTINCT FROM NEW.photo_url THEN
        UPDATE loans
        SET photo_url = NEW.photo_url
        WHERE customer_id = NEW.id;
        
        UPDATE emergency_loans
        SET photo_url = NEW.photo_url
        WHERE customer_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync photo when customer updates
CREATE TRIGGER sync_customer_photo_on_update
    AFTER UPDATE OF photo_url ON customers
    FOR EACH ROW
    EXECUTE FUNCTION sync_customer_photo_to_loans();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 7: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Disable RLS for development (enable in production with proper policies)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE repayments DISABLE ROW LEVEL SECURITY;
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE batch_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE pending_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE collected_customers DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 8: SAMPLE DATA
-- ============================================

-- Insert sample team leaders
INSERT INTO employees (id, name, email, phone, designation) VALUES
    ('TL001', 'Rajesh Kumar', 'rajesh.kumar@mrgroups.com', '9876543210', 'Team Leader'),
    ('TL002', 'Priya Sharma', 'priya.sharma@mrgroups.com', '9876543211', 'Senior Team Leader'),
    ('TL003', 'Amit Patel', 'amit.patel@mrgroups.com', '9876543212', 'Team Leader'),
    ('TL004', 'Sunita Singh', 'sunita.singh@mrgroups.com', '9876543213', 'Team Leader')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 9: VERIFICATION
-- ============================================

-- Verify setup
SELECT '✅ Database setup completed successfully!' AS message;

-- Count tables created
SELECT 
    '📊 Tables Created: ' || COUNT(*)::text AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- List all tables
SELECT 
    '📋 ' || table_name AS tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verify employees
SELECT '👥 Employees created: ' || COUNT(*)::text AS employee_count FROM employees;

-- Verify photo_url columns exist in all required tables
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'photo_url'
        ) THEN '✅ Photo upload support enabled (customers.photo_url exists)'
        ELSE '❌ Photo upload support missing (customers.photo_url not found)'
    END AS customers_photo_status;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'loans' AND column_name = 'photo_url'
        ) THEN '✅ Auto photo sync to loans enabled (loans.photo_url exists)'
        ELSE '❌ Auto photo sync missing (loans.photo_url not found)'
    END AS loans_photo_status;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'emergency_loans' AND column_name = 'photo_url'
        ) THEN '✅ Auto photo sync to emergency loans enabled (emergency_loans.photo_url exists)'
        ELSE '❌ Auto photo sync missing (emergency_loans.photo_url not found)'
    END AS emergency_loans_photo_status;

-- Verify triggers are created
SELECT 
    '📋 Triggers created: ' || COUNT(*)::text AS trigger_count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%photo%';

-- List photo-related triggers
SELECT 
    '⚡ ' || trigger_name AS photo_triggers
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%photo%'
ORDER BY trigger_name;

-- ============================================
-- END OF SCHEMA
-- ============================================
