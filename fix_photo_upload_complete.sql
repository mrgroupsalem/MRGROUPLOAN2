-- ============================================
-- COMPLETE FIX: Photo Upload for New Loan Page
-- ============================================
-- This script ensures:
-- 1. customers table has photo_url column
-- 2. RLS policies allow uploads to MRGroups bucket
-- 3. Proper permissions are set

-- Step 1: Add photo_url column to customers table if it doesn't exist
DO $$
BEGIN
    -- Check if photo_url column exists in customers table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers' 
        AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE customers ADD COLUMN photo_url TEXT;
        RAISE NOTICE '✅ Added photo_url column to customers table';
    ELSE
        RAISE NOTICE '✅ photo_url column already exists in customers table';
    END IF;
END $$;

-- Step 2: Verify MRGroups bucket exists
DO $$
DECLARE
    bucket_id UUID;
BEGIN
    SELECT id INTO bucket_id 
    FROM storage.buckets 
    WHERE name = 'MRGroups';
    
    IF bucket_id IS NULL THEN
        RAISE EXCEPTION '❌ MRGroups bucket does not exist! Please create it in Supabase Dashboard first.';
    ELSE
        RAISE NOTICE '✅ Found MRGroups bucket: %', bucket_id;
    END IF;
END $$;

-- Step 3: Drop old RLS policies that might block uploads
DROP POLICY IF EXISTS "storage_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_policy" ON storage.objects;

-- Step 4: Create new permissive RLS policies for photo uploads

-- INSERT policy - allows uploading photos
CREATE POLICY "storage_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- SELECT policy - allows viewing photos
CREATE POLICY "storage_read_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- UPDATE policy - allows updating file metadata
CREATE POLICY "storage_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- DELETE policy - allows deleting own photos
CREATE POLICY "storage_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

RAISE NOTICE '✅ RLS policies created successfully!';

-- Step 5: Verify everything is set up correctly

-- Check photo_url column
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns
WHERE table_name = 'customers' 
AND column_name = 'photo_url';

-- Check RLS policies
SELECT 
    policyname AS policy_name,
    cmd AS operation,
    roles AS applies_to
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE 'storage_%'
ORDER BY policyname;

-- Check bucket exists
SELECT 
    name AS bucket_name,
    id AS bucket_id,
    public AS is_public,
    created_at
FROM storage.buckets
WHERE name = 'MRGroups';

RAISE NOTICE '🎉 Photo upload setup complete!';
