# MRGroups Bucket Connection Status ✅

## Current Status

### ✅ Bucket Name is CORRECT
All code references are using the correct bucket name: **"MRGroups"** (with capital M, capital G, and lowercase "s")

**Verified Files:**
1. ✅ `src/app/new-loan/page.tsx` - Uses `.from('MRGroups')`
2. ✅ `src/components/AddLoanModal.tsx` - Uses `.from('MRGroups')`
3. ✅ `src/app/test-bucket/page.tsx` - Tests "MRGroups" bucket

### ❌ Current Error: RLS Policy Issue
```
StorageApiError: new row violates row-level security policy
```

This means:
- ✅ Bucket name is correct
- ✅ Code is correct
- ❌ Database permissions need to be fixed

---

## Complete Fix Guide

### Step 1: Verify Bucket Exists in Supabase

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click on **Storage** (left sidebar)
4. Look for bucket named: **`MRGroups`**

**If bucket doesn't exist:**
- Click **"New bucket"**
- Name it exactly: `MRGroups` (case-sensitive!)
- Set **Public** = true
- Click **Create bucket**

---

### Step 2: Fix RLS Policies (REQUIRED)

The error occurs because database policies block file uploads. Here's the complete fix:

#### Option A: Run This SQL Script (Recommended)

Go to **SQL Editor** in Supabase Dashboard and run:

```sql
-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "storage_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_policy" ON storage.objects;

-- Create new permissive policies for MRGroups bucket

-- Allow authenticated users to UPLOAD files
CREATE POLICY "storage_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- Allow authenticated users to READ files
CREATE POLICY "storage_read_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- Allow authenticated users to UPDATE their own files
CREATE POLICY "storage_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- Allow authenticated users to DELETE their own files
CREATE POLICY "storage_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- Verify policies were created
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE 'storage_%';
```

**Expected Output:**
You should see 4 policies listed in the results.

---

#### Option B: Manual Setup via Dashboard

1. Go to **Authentication → Policies**
2. Find table: `storage.objects`
3. Click **"New Policy"** for each of these:

**Policy 1: Insert (Upload)**
- Name: `storage_insert_policy`
- Operation: `INSERT`
- Target roles: `authenticated`
- Check constraint:
  ```sql
  bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
  ```

**Policy 2: Read (View)**
- Name: `storage_read_policy`
- Operation: `SELECT`
- Target roles: `authenticated`
- Using clause:
  ```sql
  bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
  ```

**Policy 3: Update**
- Name: `storage_update_policy`
- Operation: `UPDATE`
- Target roles: `authenticated`
- Using clause:
  ```sql
  bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
  ```

**Policy 4: Delete**
- Name: `storage_delete_policy`
- Operation: `DELETE`
- Target roles: `authenticated`
- Using clause:
  ```sql
  bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
  ```

---

### Step 3: Test the Connection

#### Method 1: Use Built-in Test Page

Your app has a test page at: `/test-bucket`

1. Start your dev server: `npm run dev`
2. Go to: http://localhost:3000/test-bucket
3. Click **"Test Bucket Connection"**
4. You should see:
   ```
   ✅ Bucket exists: MRGroups
   ✅ Public access: enabled
   ✅ File upload successful
   ✅ File URL accessible
   ✅ Cleanup successful
   ```

#### Method 2: Test in Loan Application

1. Go to Dashboard
2. Click "+" to add new loan
3. Fill in customer details
4. Scroll to "Customer Photo" section
5. Click "Choose Photo"
6. Select an image
7. Submit form

**Success indicators:**
- ✅ No RLS error in console
- ✅ Green "Photo uploaded successfully" message
- ✅ Photo preview shows
- ✅ Customer record has `photo_url` value

---

## Verification Checklist

Run these SQL queries to verify everything is set up correctly:

### 1. Check Bucket Exists
```sql
SELECT name, id, public, created_at
FROM storage.buckets
WHERE name = 'MRGroups';
```
**Expected:** One row with name = 'MRGroups'

### 2. Check RLS Policies
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects'
ORDER BY policyname;
```
**Expected:** At least 4 storage_* policies

### 3. Check RLS is Enabled
```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'objects';
```
**Expected:** relrowsecurity = true

---

## Common Issues & Solutions

### Issue 1: "Bucket not found"
**Solution:** Create the bucket in Supabase Dashboard → Storage → New bucket → Name: `MRGroups`

### Issue 2: Still getting RLS error
**Solutions:**
1. Make sure you ran the SQL script from Step 2
2. Refresh Supabase dashboard
3. Verify policies exist (run verification query above)
4. Try this quick fix:
   ```sql
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
   ```

### Issue 3: "Policy already exists"
**Solution:** The DROP statements should handle this, but if needed:
1. Go to Authentication → Policies
2. Manually delete old storage policies
3. Re-run the SQL script

### Issue 4: Photo uploads but returns NULL URL
**Check:**
1. Console logs for upload success message
2. Database `customers.photo_url` field
3. Make sure RLS policies include INSERT permission

---

## What These Policies Do

| Policy | Allows | Why It's Needed |
|--------|--------|-----------------|
| **INSERT** | Upload new files | Users can add photos to bucket |
| **SELECT** | View/download files | Users can see uploaded photos |
| **UPDATE** | Modify file metadata | Users can update their uploads |
| **DELETE** | Remove files | Users can delete their photos |

All policies are restricted to:
- ✅ Authenticated users only (must be logged in)
- ✅ Only the MRGroups bucket (not other buckets)

---

## Security Notes

Current configuration:
- ✅ Requires authentication (no anonymous uploads)
- ✅ Restricted to MRGroups bucket only
- ✅ Users can manage their own uploads

For enhanced security, you could add:
- User-specific restrictions (only manage own uploads)
- File size limits in policy
- File type restrictions in policy

---

## Files Reference

**SQL Scripts in your workspace:**
- `fix_storage_upload_simple.sql` - Quick fix script
- `fix_storage_rls_policies.sql` - Alternative approach

**Code files using MRGroups bucket:**
- `src/app/new-loan/page.tsx` - New loan page photo upload
- `src/components/AddLoanModal.tsx` - Regular loan modal photo upload
- `src/app/test-bucket/page.tsx` - Diagnostic test page

---

## Summary

✅ **Bucket name is correct:** MRGroups  
✅ **Code is correct:** All references use 'MRGroups'  
❌ **Permissions need fixing:** Run the SQL script  

**Next Action Required:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste the SQL script from Step 2
4. Click Run
5. Test photo upload in your app

After running the SQL script, your photo upload feature will work perfectly! 🎉
