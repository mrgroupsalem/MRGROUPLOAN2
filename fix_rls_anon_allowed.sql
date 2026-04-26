-- ============================================
-- ALTERNATIVE FIX: Allow Anonymous Photo Uploads
-- ============================================
-- Use this if your app doesn't require authentication for photo uploads

-- Step 1: Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
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
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations" ON storage.objects;

-- Step 3: Create a single permissive policy for ALL operations
-- This allows both authenticated and anonymous users
CREATE POLICY "Allow all operations"
ON storage.objects FOR ALL
TO public
USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
)
WITH CHECK (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- Step 4: Grant permissions
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO authenticated;

-- Step 5: Verify
SELECT 
    policyname,
    cmd AS operation,
    roles,
    permissive
FROM pg_policies 
WHERE tablename = 'objects';

RAISE NOTICE '🎉 RLS policies updated to allow ALL users (authenticated and anonymous) to upload photos!';
