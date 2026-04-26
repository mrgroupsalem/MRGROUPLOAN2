-- MR Groups Loan Management System Database Schema
-- PostgreSQL/Supabase compatible

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees table (for workers/team leaders)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    designation VARCHAR(100),
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loans table (enhanced)
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'closed', 'pending')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    interest_rate VARCHAR(20) DEFAULT '8.33',
    number_of_weeks INTEGER DEFAULT 15,
    team_leader_id UUID REFERENCES employees(id),
    weekly_batch VARCHAR(20) CHECK (weekly_batch IN ('tuesday', 'thursday', 'friday')),
    loan_purpose TEXT,
    customer_bank_name VARCHAR(255),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collections table (for tracking collections)
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES employees(id),
    amount_collected DECIMAL(15,2) NOT NULL CHECK (amount_collected >= 0),
    remaining_balance DECIMAL(15,2) NOT NULL CHECK (remaining_balance >= 0),
    collection_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('completed', 'partial', 'pending')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repayments table
CREATE TABLE repayments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount_paid DECIMAL(15,2) NOT NULL CHECK (amount_paid > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batches table (for weekly collections)
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    batch_date DATE NOT NULL,
    total_collection DECIMAL(15,2) DEFAULT 0,
    customer_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batch customers table (many-to-many relationship)
CREATE TABLE batch_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'partial', 'unpaid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_loans_customer_id ON loans(customer_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_team_leader_id ON loans(team_leader_id);
CREATE INDEX idx_loans_weekly_batch ON loans(weekly_batch);
CREATE INDEX idx_collections_loan_id ON collections(loan_id);
CREATE INDEX idx_collections_customer_id ON collections(customer_id);
CREATE INDEX idx_collections_worker_id ON collections(worker_id);
CREATE INDEX idx_collections_date ON collections(collection_date);
CREATE INDEX idx_repayments_loan_id ON repayments(loan_id);
CREATE INDEX idx_repayments_payment_date ON repayments(payment_date);
CREATE INDEX idx_batch_customers_batch_id ON batch_customers(batch_id);
CREATE INDEX idx_batch_customers_customer_id ON batch_customers(customer_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_employees_email ON employees(email);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updating timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate loan balance
CREATE OR REPLACE FUNCTION calculate_loan_balance(loan_uuid UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    loan_amount DECIMAL(15,2);
    total_paid DECIMAL(15,2);
BEGIN
    -- Get loan amount
    SELECT amount INTO loan_amount FROM loans WHERE id = loan_uuid;
    
    -- Get total repayments
    SELECT COALESCE(SUM(amount_paid), 0) INTO total_paid 
    FROM repayments WHERE loan_id = loan_uuid;
    
    RETURN loan_amount - total_paid;
END;
$$ LANGUAGE plpgsql;

-- Function to update batch statistics
CREATE OR REPLACE FUNCTION update_batch_stats(batch_uuid UUID)
RETURNS VOID AS $$
DECLARE
    total_collection DECIMAL(15,2);
    customer_count INTEGER;
BEGIN
    -- Calculate total collection and customer count
    SELECT 
        COALESCE(SUM(amount_paid), 0),
        COUNT(DISTINCT customer_id)
    INTO total_collection, customer_count
    FROM batch_customers 
    WHERE batch_id = batch_uuid;
    
    -- Update batch table
    UPDATE batches 
    SET 
        total_collection = total_collection,
        customer_count = customer_count,
        updated_at = NOW()
    WHERE id = batch_uuid;
END;
$$ LANGUAGE plpgsql;

-- Sample data (for development)
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@mrgroups.com', '$2a$10$example_hash', 'admin'),
('Staff User', 'staff@mrgroups.com', '$2a$10$example_hash', 'staff');

INSERT INTO customers (name, phone, address) VALUES
('John Doe', '+91-9876543210', '123 Main St, Mumbai'),
('Jane Smith', '+91-9876543211', '456 Oak Ave, Delhi'),
('Bob Johnson', '+91-9876543212', '789 Pine Rd, Bangalore'),
('Alice Brown', '+91-9876543213', '321 Elm St, Chennai'),
('Charlie Wilson', '+91-9876543214', '654 Maple Ave, Kolkata');

INSERT INTO employees (name, email, phone, designation, department) VALUES
('Rajesh Kumar', 'rajesh@mrgroups.com', '+91-9876543210', 'Team Leader', 'Operations'),
('Priya Sharma', 'priya@mrgroups.com', '+91-9876543211', 'Senior Team Leader', 'Operations'),
('Amit Patel', 'amit@mrgroups.com', '+91-9876543212', 'Team Leader', 'Operations'),
('Sunita Singh', 'sunita@mrgroups.com', '+91-9876543213', 'Team Leader', 'Operations');

INSERT INTO loans (customer_id, amount, status, start_date, end_date, interest_rate, number_of_weeks, team_leader_id, weekly_batch) VALUES
((SELECT id FROM customers WHERE phone = '+91-9876543210'), 100000, 'active', '2024-01-01', '2024-04-15', '8.33', 15, (SELECT id FROM employees WHERE email = 'rajesh@mrgroups.com'), 'tuesday'),
((SELECT id FROM customers WHERE phone = '+91-9876543211'), 150000, 'active', '2024-01-15', '2024-05-01', '12', 15, (SELECT id FROM employees WHERE email = 'priya@mrgroups.com'), 'thursday'),
((SELECT id FROM customers WHERE phone = '+91-9876543212'), 200000, 'active', '2024-02-01', '2024-05-15', '10', 15, (SELECT id FROM employees WHERE email = 'amit@mrgroups.com'), 'friday'),
((SELECT id FROM customers WHERE phone = '+91-9876543213'), 120000, 'active', '2024-02-15', '2024-06-01', '8.33', 15, (SELECT id FROM employees WHERE email = 'sunita@mrgroups.com'), 'tuesday'),
((SELECT id FROM customers WHERE phone = '+91-9876543214'), 180000, 'active', '2024-03-01', '2024-06-15', '12', 15, (SELECT id FROM employees WHERE email = 'rajesh@mrgroups.com'), 'thursday');

-- Row Level Security (RLS) policies for Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_customers ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your authentication setup)
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Staff can view all customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Staff can view all employees" ON employees FOR SELECT USING (true);
CREATE POLICY "Staff can view all loans" ON loans FOR SELECT USING (true);
CREATE POLICY "Staff can view all collections" ON collections FOR SELECT USING (true);
CREATE POLICY "Staff can view all repayments" ON repayments FOR SELECT USING (true);
CREATE POLICY "Staff can view all batches" ON batches FOR SELECT USING (true);
CREATE POLICY "Staff can view all batch customers" ON batch_customers FOR SELECT USING (true);

-- Insert/Update policies
CREATE POLICY "Staff can insert customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update customers" ON customers FOR UPDATE USING (true);
CREATE POLICY "Staff can insert employees" ON employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update employees" ON employees FOR UPDATE USING (true);
CREATE POLICY "Staff can insert loans" ON loans FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update loans" ON loans FOR UPDATE USING (true);
CREATE POLICY "Staff can insert collections" ON collections FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update collections" ON collections FOR UPDATE USING (true);
CREATE POLICY "Staff can insert repayments" ON repayments FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can insert batches" ON batches FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update batches" ON batches FOR UPDATE USING (true);
CREATE POLICY "Staff can insert batch customers" ON batch_customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update batch customers" ON batch_customers FOR UPDATE USING (true);
