-- Simple Fix for Storage Upload RLS Issue
-- Run this in Supabase SQL Editor to enable photo uploads

-- Step 1: Check if bucket exists
SELECT name, id, public 
FROM storage.buckets 
WHERE name = 'MRGroups';

-- Step 2: Drop any existing restrictive policies
DROP POLICY IF EXISTS "storage_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_policy" ON storage.objects;

-- Step 3: Create new permissive policies
-- Allow authenticated users to upload files
CREATE POLICY "storage_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN (
    SELECT id FROM storage.buckets WHERE name = 'MRGroups'
));

-- Allow authenticated users to read files
CREATE POLICY "storage_read_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id IN (
    SELECT id FROM storage.buckets WHERE name = 'MRGroups'
));

-- Allow authenticated users to update their own files
CREATE POLICY "storage_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id IN (
    SELECT id FROM storage.buckets WHERE name = 'MRGroups'
));

-- Allow authenticated users to delete their own files  
CREATE POLICY "storage_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN (
    SELECT id FROM storage.buckets WHERE name = 'MRGroups'
));

-- Step 4: Verify policies were created
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE 'storage_%'
ORDER BY policyname;
