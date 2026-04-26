-- =====================================================
-- SUPABASE TABLE CREATION QUERIES
-- Based on sample-loans.csv structure
-- =====================================================

-- 1. CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE,
    address TEXT,
    aadhaar_number VARCHAR(20),
    pan_number VARCHAR(15),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_aadhaar ON customers(aadhaar_number);
CREATE INDEX IF NOT EXISTS idx_customers_pan ON customers(pan_number);

-- 2. EMPLOYEES TABLE (Team Leaders)
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(20) PRIMARY KEY, -- Custom ID like TL001, TL002, etc.
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(15),
    designation VARCHAR(100) DEFAULT 'Team Leader',
    department VARCHAR(100) DEFAULT 'Loan Management',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_employees_id ON employees(id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- 3. LOANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    interest_rate DECIMAL(5,2) NOT NULL CHECK (interest_rate >= 0 AND interest_rate <= 100),
    number_of_weeks INTEGER NOT NULL CHECK (number_of_weeks > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'closed', 'pending')),
    start_date DATE NOT NULL,
    end_date DATE,
    loan_purpose VARCHAR(255),
    customer_bank_name VARCHAR(255),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    weekly_batch VARCHAR(20) CHECK (weekly_batch IN ('tuesday', 'thursday', 'friday')),
    team_leader_id VARCHAR(20) REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loans_customer_id ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_team_leader_id ON loans(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_loans_weekly_batch ON loans(weekly_batch);
CREATE INDEX IF NOT EXISTS idx_loans_start_date ON loans(start_date);
CREATE INDEX IF NOT EXISTS idx_loans_end_date ON loans(end_date);

-- 4. COLLECTIONS TABLE (for loan payments)
-- =====================================================
CREATE TABLE IF NOT EXISTS collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    collection_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    notes TEXT,
    collected_by VARCHAR(20) REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_collections_loan_id ON collections(loan_id);
CREATE INDEX IF NOT EXISTS idx_collections_date ON collections(collection_date);
CREATE INDEX IF NOT EXISTS idx_collections_collected_by ON collections(collected_by);

-- 5. UPDATE TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all tables
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at 
    BEFORE UPDATE ON loans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. SAMPLE DATA INSERTION
-- =====================================================

-- Insert sample employees (Team Leaders)
INSERT INTO employees (id, name, email, phone, designation, department) VALUES
('TL001', 'Rajesh Kumar', 'rajesh.kumar@company.com', '9876543210', 'Team Leader', 'Loan Management'),
('TL002', 'Priya Sharma', 'priya.sharma@company.com', '9876543211', 'Team Leader', 'Loan Management'),
('TL003', 'Amit Patel', 'amit.patel@company.com', '9876543212', 'Team Leader', 'Loan Management')
ON CONFLICT (id) DO NOTHING;

-- Insert sample customers
INSERT INTO customers (id, name, phone, address, aadhaar_number, pan_number) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'John Doe', '9876543210', '123 Main St, City', '1234-5678-9012', 'ABCDE1234F'),
('550e8400-e29b-41d4-a716-446655440002', 'Jane Smith', '9876543211', '456 Oak Ave, Town', '9876-5432-1098', 'FGHIJ5678K'),
('550e8400-e29b-41d4-a716-446655440003', 'Mike Johnson', '9876543212', '789 Pine Rd, Village', '5555-6666-7777', 'KLMNO9012P'),
('550e8400-e29b-41d4-a716-446655440004', 'Sarah Wilson', '9876543213', '321 Elm St, Metro', '1111-2222-3333', 'PQRST3456U'),
('550e8400-e29b-41d4-a716-446655440005', 'David Brown', '9876543214', '654 Maple Dr, Suburb', '4444-5555-6666', 'VWXYZ7890V')
ON CONFLICT (phone) DO NOTHING;

-- Insert sample loans
INSERT INTO loans (
    id, customer_id, amount, interest_rate, number_of_weeks, 
    status, start_date, end_date, loan_purpose, customer_bank_name, 
    account_number, ifsc_code, weekly_batch, team_leader_id
) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 50000.00, 12.00, 15, 'pending', '2024-01-01', '2024-04-15', 'Personal', 'HDFC Bank', '1234567890', 'HDFC0001234', 'tuesday', 'TL001'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 75000.00, 10.00, 20, 'pending', '2024-01-15', '2024-05-30', 'Business', 'ICICI Bank', '2345678901', 'ICIC0001234', 'thursday', 'TL002'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 30000.00, 15.00, 12, 'pending', '2024-02-01', '2024-04-30', 'Education', 'SBI', '3456789012', 'SBIN0001234', 'friday', 'TL001'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 100000.00, 8.00, 25, 'pending', '2024-02-15', '2024-08-15', 'Home Loan', 'Axis Bank', '4567890123', 'AXIS0001234', 'tuesday', 'TL003'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 60000.00, 11.00, 18, 'pending', '2024-03-01', '2024-06-30', 'Vehicle', 'PNB', '5678901234', 'PNB0001234', 'thursday', 'TL002')
ON CONFLICT DO NOTHING;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON customers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON employees
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON loans
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON collections
    FOR ALL USING (auth.role() = 'authenticated');

-- 8. USEFUL VIEWS
-- =====================================================

-- View for loan details with customer and team leader info
CREATE OR REPLACE VIEW loan_details AS
SELECT 
    l.id as loan_id,
    l.amount,
    l.interest_rate,
    l.number_of_weeks,
    l.status,
    l.start_date,
    l.end_date,
    l.loan_purpose,
    l.customer_bank_name,
    l.account_number,
    l.ifsc_code,
    l.weekly_batch,
    l.created_at as loan_created_at,
    c.id as customer_id,
    c.name as customer_name,
    c.phone as customer_phone,
    c.address as customer_address,
    c.aadhaar_number,
    c.pan_number,
    e.id as team_leader_id,
    e.name as team_leader_name,
    e.phone as team_leader_phone
FROM loans l
LEFT JOIN customers c ON l.customer_id = c.id
LEFT JOIN employees e ON l.team_leader_id = e.id;

-- View for collection summary
CREATE OR REPLACE VIEW collection_summary AS
SELECT 
    l.id as loan_id,
    c.name as customer_name,
    l.amount as loan_amount,
    COALESCE(SUM(col.amount), 0) as total_collected,
    l.amount - COALESCE(SUM(col.amount), 0) as remaining_amount,
    COUNT(col.id) as collection_count
FROM loans l
LEFT JOIN customers c ON l.customer_id = c.id
LEFT JOIN collections col ON l.id = col.loan_id
GROUP BY l.id, c.name, l.amount;

-- =====================================================
-- END OF TABLE CREATION QUERIES
-- =====================================================
