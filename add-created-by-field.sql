-- Run this SQL in your Supabase SQL editor
-- This adds the created_by field to track which user created each customer

-- Add created_by column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);

-- Update existing customers to have a default created_by value
-- Using the first admin user as default creator
UPDATE customers 
SET created_by = (
  SELECT id FROM users 
  WHERE role = 'admin' 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE created_by IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' AND column_name = 'created_by';