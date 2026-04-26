-- ============================================
-- FINAL FIX: RLS Policies for Photo Upload
-- ============================================
-- This script fixes the "new row violates row-level security policy" error
-- by creating permissive policies for the MRGroups bucket

-- Step 1: Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on storage.objects to start fresh
DROP POLICY IF EXISTS "storage_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert" ON storage.objects;

-- Step 3: Get the bucket ID for MRGroups
DO $$
DECLARE
    target_bucket_id UUID;
BEGIN
    SELECT id INTO target_bucket_id 
    FROM storage.buckets 
    WHERE name = 'MRGroups';
    
    IF target_bucket_id IS NULL THEN
        RAISE EXCEPTION '❌ MRGroups bucket not found! Please create it in Supabase Dashboard first.';
    END IF;
    
    RAISE NOTICE '✅ Found MRGroups bucket with ID: %', target_bucket_id;
END $$;

-- Step 4: Create permissive policies that allow uploads

-- Policy 1: Allow ANYONE to read files (public bucket behavior)
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- Policy 2: Allow authenticated users to INSERT (upload) files
CREATE POLICY "Allow authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- Policy 3: Allow authenticated users to UPDATE files
CREATE POLICY "Allow authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- Policy 4: Allow authenticated users to DELETE files
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- Step 5: Verify policies were created
SELECT 
    policyname,
    cmd AS operation,
    roles,
    permissive
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE 'Allow%'
ORDER BY policyname;

-- Step 6: Check if bucket is public
SELECT 
    name,
    public AS is_public,
    created_at
FROM storage.buckets
WHERE name = 'MRGroups';

-- Step 7: Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.buckets TO anon;

RAISE NOTICE '🎉 RLS policies fixed! Photo upload should now work.';
RAISE NOTICE 'Note: Make sure the MRGroups bucket is set to PUBLIC in Supabase Dashboard.';
