# Fix: Photo Upload RLS Policy Error

## Problem
```
❌ Upload error details: StorageApiError: new row violates row-level security policy
```

This error occurs when **Row-Level Security (RLS)** policies in Supabase are blocking file uploads to the storage bucket.

## Root Cause
The `storage.objects` table has RLS policies that prevent authenticated users from INSERTING (uploading) files, even though they should have permission.

## Solution

### Option 1: Run SQL Script (Recommended) ⭐

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project
   - Go to **SQL Editor**

2. **Run the Fix Script**
   - Copy the contents of `fix_storage_upload_simple.sql`
   - Paste into SQL Editor
   - Click **Run** or press Ctrl+Enter

3. **Verify Success**
   - You should see output showing 4 new policies created:
     - `storage_insert_policy` ✅
     - `storage_read_policy` ✅
     - `storage_update_policy` ✅
     - `storage_delete_policy` ✅

### Option 2: Manual Fix via Dashboard

1. **Navigate to Authentication → Policies**
2. **Find the `storage.objects` table**
3. **Add New Policies:**

#### Insert Policy (Most Important!)
- **Policy Name:** `storage_insert_policy`
- **Allowed Operation:** INSERT
- **Target Roles:** authenticated
- **Policy Definition:**
  ```sql
  bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
  ```

#### Read Policy
- **Policy Name:** `storage_read_policy`
- **Allowed Operation:** SELECT
- **Target Roles:** authenticated
- **Policy Definition:**
  ```sql
  bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
  ```

#### Update Policy
- **Policy Name:** `storage_update_policy`
- **Allowed Operation:** UPDATE
- **Target Roles:** authenticated
- **Policy Definition:**
  ```sql
  bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
  ```

#### Delete Policy
- **Policy Name:** `storage_delete_policy`
- **Allowed Operation:** DELETE
- **Target Roles:** authenticated
- **Policy Definition:**
  ```sql
  bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups')
  ```

### Option 3: Disable RLS Temporarily (Quick Test)

⚠️ **Only for testing! Not recommended for production.**

```sql
-- Disable RLS on storage.objects table
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

This will allow all operations but is **NOT secure** for production use.

## Testing After Fix

1. **Refresh your app** (Ctrl+F5 or Cmd+Shift+R)
2. **Try uploading a photo** in the loan application form
3. **Check browser console** - should see:
   ```
   📸 Starting photo upload...
   Bucket: MRGroups
   File name: customer-photos/[timestamp]_[random].jpg
   ✅ Photo uploaded successfully: [url]
   ```
4. **Verify in database** - check `customers.photo_url` field is populated

## Verification Steps

### Check Bucket Exists
```sql
SELECT name, id, public 
FROM storage.buckets 
WHERE name = 'MRGroups';
```

### Check Current Policies
```sql
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'objects'
ORDER BY policyname;
```

### Check RLS Status
```sql
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'objects';
```

## Common Issues

### Issue: "Bucket not found"
**Solution:** Make sure the `MRGroups` bucket exists in Supabase Dashboard → Storage

### Issue: Still getting RLS error after running script
**Solutions:**
1. Refresh the Supabase dashboard
2. Check if policies were actually created (run verification query above)
3. Try disabling/enabling RLS:
   ```sql
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
   ```

### Issue: "Policy already exists"
**Solution:** The DROP statements should handle this, but you can manually delete old policies first in Dashboard → Authentication → Policies

## Files Provided

1. **`fix_storage_upload_simple.sql`** - Recommended fix (use this one first)
2. **`fix_storage_rls_policies.sql`** - Alternative approach (if first doesn't work)

## What This Fixes

✅ Allows authenticated users to **upload** photos  
✅ Allows authenticated users to **view** photos  
✅ Allows authenticated users to **delete** their own photos  
✅ Restricts access to only the `MRGroups` bucket  
✅ Maintains security by requiring authentication  

## Next Steps

After running the SQL script:
1. ✅ Test photo upload in Regular Loan Application modal
2. ✅ Test photo upload in New Loan page (`/new-loan`)
3. ✅ Verify photos are saved and displayed correctly
4. ✅ Check database for `photo_url` values

## Security Notes

These policies ensure that:
- Only **authenticated users** can upload/view/delete files
- Users can only access files in the **MRGroups** bucket
- Basic security is maintained while allowing necessary operations

For enhanced security, you could add user-specific restrictions (e.g., users can only manage their own uploads).
