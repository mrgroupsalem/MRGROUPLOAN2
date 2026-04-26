-- Fix RLS Policies for MRGroups Storage Bucket
-- This script enables proper permissions for authenticated users to upload photos

-- 1. First, let's check if the bucket exists and get its ID
DO $$
DECLARE
    bucket_id UUID;
BEGIN
    -- Get the bucket ID for 'MRGroups'
    SELECT id INTO bucket_id 
    FROM storage.buckets 
    WHERE name = 'MRGroups';
    
    IF bucket_id IS NULL THEN
        RAISE NOTICE 'Bucket "MRGroups" not found. Please create it first in Supabase Dashboard.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found bucket: %', bucket_id;
    
    -- 2. Drop existing policies that might be causing issues
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
    DROP POLICY IF EXISTS "Enable read for authenticated users only" ON storage.objects;
    DROP POLICY IF EXISTS "Enable update for authenticated users only" ON storage.objects;
    DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON storage.objects;
    
    -- 3. Create new permissive policies for photo uploads
    
    -- Allow authenticated users to INSERT (upload) files
    CREATE POLICY "Enable insert for authenticated users only"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = bucket_id AND
        auth.role() = 'authenticated'
    );
    
    -- Allow authenticated users to READ (view) files
    CREATE POLICY "Enable read for authenticated users only"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = bucket_id AND
        auth.role() = 'authenticated'
    );
    
    -- Allow authenticated users to UPDATE their own files
    CREATE POLICY "Enable update for authenticated users only"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = bucket_id AND
        auth.role() = 'authenticated'
    );
    
    -- Allow authenticated users to DELETE their own files
    CREATE POLICY "Enable delete for authenticated users only"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = bucket_id AND
        auth.role() = 'authenticated'
    );
    
    RAISE NOTICE '✅ RLS policies updated successfully for MRGroups bucket!';
    
END $$;

-- 4. Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'objects'
ORDER BY policyname;
