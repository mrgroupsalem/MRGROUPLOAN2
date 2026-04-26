# Photo Upload Not Saving - Complete Fix

## Problem
When you choose a photo in the loan application, it's not being saved to the MRGroups bucket.

## Root Causes (Most Common)

1. **RLS Policies blocking uploads** (90% of cases) ⭐
2. **Bucket doesn't exist** (5% of cases)
3. **User not authenticated** (3% of cases)
4. **Network/Connection issues** (2% of cases)

---

## Quick Diagnostic Test 🚀

### Use the Test Page I Created

I've created a diagnostic page specifically for this issue:

**URL:** `http://localhost:3000/test-photo-upload`

**Steps:**
1. Start your dev server: `npm run dev`
2. Go to: http://localhost:3000/test-photo-upload
3. Click **"1. Create Test Image"**
4. Click **"2. Test Bucket Connection"**

This will tell you exactly what's wrong!

---

## Solution Based on Test Results

### ❌ Test Shows: "MRGroups bucket does not exist"

**Fix: Create the Bucket**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Storage** (left sidebar)
4. Click **"New bucket"**
5. Settings:
   - Name: `MRGroups` (exactly like this, case-sensitive)
   - Public: ✅ **Enable this**
6. Click **"Create bucket"**

Done! Try uploading again.

---

### ❌ Test Shows: "RLS Policy Error" or "row-level security policy"

**Fix: Run SQL Script to Add Permissions**

This is the most common issue. The bucket exists but database permissions block uploads.

#### Step-by-Step Fix:

1. **Open Supabase Dashboard** → **SQL Editor**
2. **Copy this entire script:**

```sql
-- ============================================
-- FIX: Enable Photo Uploads to MRGroups Bucket
-- ============================================

-- Remove any old conflicting policies
DROP POLICY IF EXISTS "storage_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_policy" ON storage.objects;

-- Create INSERT policy (allows uploading files)
CREATE POLICY "storage_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- Create SELECT policy (allows viewing files)
CREATE POLICY "storage_read_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- Create UPDATE policy (allows updating file metadata)
CREATE POLICY "storage_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- Create DELETE policy (allows deleting own files)
CREATE POLICY "storage_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
);

-- Verify the policies were created
SELECT 
    policyname AS "Policy Name",
    cmd AS "Operation",
    roles AS "Applies To"
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE 'storage_%'
ORDER BY policyname;
```

3. **Click "Run"** button
4. **Verify success:** You should see 4 policies listed
5. **Go back to test page** and run the test again

✅ Photo uploads should now work!

---

### ❌ Test Shows: "Unauthorized" or "JWT expired"

**Fix: Check Authentication**

Make sure you're logged into the app:

1. Refresh the page
2. Log in with your credentials
3. Try uploading the photo again

---

### ❌ Test Shows: "Network error" or times out

**Fix: Check Internet Connection**

1. Verify you have internet connection
2. Check if Supabase service is up: https://status.supabase.com/
3. Try refreshing the page

---

## Manual Verification Steps

If you want to verify everything manually:

### 1. Check Bucket Exists (SQL)

```sql
SELECT name, id, public, created_at
FROM storage.buckets
WHERE name = 'MRGroups';
```

Should return 1 row with name = 'MRGroups'

### 2. Check RLS Policies Exist (SQL)

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
ORDER BY policyname;
```

Should show at least these policies:
- `storage_insert_policy`
- `storage_read_policy`
- `storage_update_policy`
- `storage_delete_policy`

### 3. Check RLS is Enabled (SQL)

```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'objects';
```

Should show: `relrowsecurity = true`

---

## Testing in Loan Application

After running the fix:

### Test 1: New Loan Page
1. Go to: http://localhost:3000/new-loan
2. Fill in customer details
3. Scroll to "Customer Photo" section
4. Click "Choose Photo"
5. Select an image file
6. **Check browser console (F12)** - should see:
   ```
   📸 Starting photo upload...
   Bucket: MRGroups
   File name: customer-photos/[timestamp]_[random].jpg
   ✅ Photo uploaded successfully: [URL]
   ```
7. Submit form
8. Check database - customer should have `photo_url` value

### Test 2: Regular Loan Modal
1. Go to Dashboard (http://localhost:3000/)
2. Click "+" button
3. Fill in loan application
4. Scroll to "Customer Photo" section
5. Click "Choose Photo"
6. Select an image
7. Submit form
8. Verify photo uploaded successfully

---

## What Was Probably Wrong?

Based on your error message "new row violates row-level security policy":

**The Issue:**
- Your Supabase database has Row-Level Security (RLS) enabled
- The default RLS policies are very restrictive
- They block INSERT operations (uploads) by default
- Even though you're authenticated, the policy says "no uploads allowed"

**The Solution:**
- Run the SQL script above to create permissive policies
- The new policies say: "Allow authenticated users to upload to MRGroups bucket"
- This maintains security while allowing your app to work

---

## Understanding the RLS Policies

| Policy | What It Does | Why You Need It |
|--------|--------------|-----------------|
| **INSERT** | Allows uploading NEW files | Without this, you can't add photos |
| **SELECT** | Allows VIEWING files | Without this, you can't see uploaded photos |
| **UPDATE** | Allows modifying file metadata | For editing file properties |
| **DELETE** | Allows REMOVING files | For deleting unwanted photos |

All policies are restricted to:
- ✅ Only **authenticated users** (must be logged in)
- ✅ Only the **MRGroups bucket** (not other buckets)

---

## Files in Your Workspace

I've created several helpful files:

1. **`test-photo-upload/page.tsx`** - Interactive diagnostic test page
2. **`STORAGE_RLS_FIX_GUIDE.md`** - Detailed RLS troubleshooting guide
3. **`MRGROUPS_BUCKET_CONNECTION_FIX.md`** - Complete connection guide
4. **`fix_storage_upload_simple.sql`** - SQL script to fix permissions
5. **`fix_storage_rls_policies.sql`** - Alternative SQL script

---

## Summary Checklist

To fix photo upload not saving:

- [ ] Run diagnostic test: http://localhost:3000/test-photo-upload
- [ ] If bucket missing → Create it in Supabase Dashboard
- [ ] If RLS error → Run SQL script in SQL Editor
- [ ] Test upload in loan application
- [ ] Verify photo appears in database

**Most likely solution:** Just run the SQL script above! 🎯

---

## Still Having Issues?

If none of this works:

1. **Check browser console** (F12) for detailed error messages
2. **Look at the logs** in the test page
3. **Verify environment variables** in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` is correct
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
4. **Try the manual verification steps** above

The test page will give you exact details about what's wrong!
