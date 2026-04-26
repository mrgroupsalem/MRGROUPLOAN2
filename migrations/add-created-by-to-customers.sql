-- Migration: Add created_by field to customers table
-- This allows tracking which user created each customer

-- Add created_by column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);

-- Update existing customers to have a default created_by value
-- (You can modify this to set appropriate user IDs)
UPDATE customers 
SET created_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE created_by IS NULL;

-- Add a trigger to automatically set created_by when inserting new customers
-- Note: This requires application-level logic to pass the current user ID
-- The trigger approach won't work without session/user context in PostgreSQL
-- So we'll handle this in the application code instead

-- Example of how to manually update existing records with specific user IDs:
-- UPDATE customers SET created_by = 'USER_UUID_HERE' WHERE phone = '+91-9876543210';