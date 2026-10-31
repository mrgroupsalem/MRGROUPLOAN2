-- Migration: Add new fields for loan application enhancements
-- Run this in Supabase SQL Editor

-- Add name fields for additional mobile contacts
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS additional_mobile_1_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS additional_mobile_2_name VARCHAR(255);

-- Add location fields (latitude, longitude) to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Ensure existing additional mobile columns exist (in case they weren't added before)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS additional_mobile_1 VARCHAR(20),
  ADD COLUMN IF NOT EXISTS additional_mobile_1_relationship VARCHAR(50),
  ADD COLUMN IF NOT EXISTS additional_mobile_2 VARCHAR(20),
  ADD COLUMN IF NOT EXISTS additional_mobile_2_relationship VARCHAR(50);

-- Add is_mobile_verified flag to customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_mobile_verified BOOLEAN DEFAULT FALSE;

-- Verify the schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customers'
  AND column_name IN (
    'additional_mobile_1', 'additional_mobile_1_name', 'additional_mobile_1_relationship',
    'additional_mobile_2', 'additional_mobile_2_name', 'additional_mobile_2_relationship',
    'latitude', 'longitude', 'is_mobile_verified'
  )
ORDER BY column_name;

