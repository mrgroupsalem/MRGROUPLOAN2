-- Create emergency_collections table for emergency loan collections
-- This table is separate from collections because emergency_loans are in a different table than loans

CREATE TABLE IF NOT EXISTS emergency_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    emergency_loan_id UUID NOT NULL REFERENCES emergency_loans(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    worker_id VARCHAR(20) REFERENCES employees(id),
    amount_collected DECIMAL(15,2) NOT NULL CHECK (amount_collected >= 0),
    remaining_balance DECIMAL(15,2) NOT NULL CHECK (remaining_balance >= 0),
    collection_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'pending')),
    day_number INTEGER NOT NULL CHECK (day_number > 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emergency_collections_emergency_loan_id ON emergency_collections(emergency_loan_id);
CREATE INDEX IF NOT EXISTS idx_emergency_collections_customer_id ON emergency_collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_emergency_collections_worker_id ON emergency_collections(worker_id);
CREATE INDEX IF NOT EXISTS idx_emergency_collections_date ON emergency_collections(collection_date);
CREATE INDEX IF NOT EXISTS idx_emergency_collections_day_number ON emergency_collections(emergency_loan_id, day_number);

-- Add RLS policies
ALTER TABLE emergency_collections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable select for emergency_collections" ON emergency_collections;
DROP POLICY IF EXISTS "Enable insert for emergency_collections" ON emergency_collections;
DROP POLICY IF EXISTS "Enable update for emergency_collections" ON emergency_collections;
DROP POLICY IF EXISTS "Enable delete for emergency_collections" ON emergency_collections;

-- Create policies
CREATE POLICY "Enable select for emergency_collections" 
    ON emergency_collections FOR SELECT USING (true);

CREATE POLICY "Enable insert for emergency_collections" 
    ON emergency_collections FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for emergency_collections" 
    ON emergency_collections FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for emergency_collections" 
    ON emergency_collections FOR DELETE USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_emergency_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS emergency_collections_updated_at ON emergency_collections;

CREATE TRIGGER emergency_collections_updated_at
    BEFORE UPDATE ON emergency_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_emergency_collections_updated_at();
