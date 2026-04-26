-- =====================================================
-- ESSENTIAL SUPABASE TABLES FOR LOAN MANAGEMENT
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. EMPLOYEES TABLE (Team Leaders)
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(20) PRIMARY KEY, -- Custom ID like TL001, TL002, etc.
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(15),
    designation VARCHAR(100) DEFAULT 'Team Leader',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. LOANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    number_of_weeks INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    start_date DATE NOT NULL,
    end_date DATE,
    loan_purpose VARCHAR(255),
    customer_bank_name VARCHAR(255),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    weekly_batch VARCHAR(20),
    team_leader_id VARCHAR(20) REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SAMPLE DATA INSERTION
-- =====================================================

-- Insert sample employees (Team Leaders)
INSERT INTO employees (id, name, email, phone) VALUES
('TL001', 'Rajesh Kumar', 'rajesh.kumar@company.com', '9876543210'),
('TL002', 'Priya Sharma', 'priya.sharma@company.com', '9876543211'),
('TL003', 'Amit Patel', 'amit.patel@company.com', '9876543212')
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
