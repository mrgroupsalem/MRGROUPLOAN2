# 🚀 QUICK START: Fix Photo Upload in 5 Minutes

## Problem
Photo upload not working in `/new-loan` page - doesn't save to MRGroups bucket

---

## ✅ THE FIX (Do This NOW)

### **Open Supabase Dashboard → SQL Editor → Paste This:**

```sql
-- Add photo_url column if missing
ALTER TABLE customers ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Drop old policies
DROP POLICY IF EXISTS "storage_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_policy" ON storage.objects;

-- Create new policies for MRGroups bucket
CREATE POLICY "storage_insert_policy"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups'));

CREATE POLICY "storage_read_policy"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups'));

CREATE POLICY "storage_update_policy"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups'));

CREATE POLICY "storage_delete_policy"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN (SELECT id FROM storage.buckets WHERE name = 'MRGroups'));
```

### **Click "Run"**

That's it! ✅ Done!

---

## 🧪 Test It

1. Go to: http://localhost:3000/new-loan
2. Fill in customer details
3. Scroll to "Customer Photo" section
4. Click "Choose Photo"
5. Select an image
6. Submit form

**Expected Results:**
- ✅ No errors
- ✅ Green success message
- ✅ Console shows: "✅ Photo uploaded successfully"
- ✅ Customer has photo_url in database

---

## 🔍 Verify It Worked

Run this in SQL Editor:

```sql
SELECT name, phone, photo_url 
FROM customers 
WHERE photo_url IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;
```

You should see your uploaded photos! 🎉

---

## 📋 What If It Still Doesn't Work?

### Check 1: Does MRGroups bucket exist?
```sql
SELECT name, id, public 
FROM storage.buckets 
WHERE name = 'MRGroups';
```

If no results → **Create the bucket first!**
- Go to Storage → New bucket
- Name: `MRGroups`
- Public: ✅ Enable

### Check 2: Are you authenticated?
Make sure you're logged into the app

### Check 3: Browser console
Press F12 and look for error messages

---

## 📖 Full Documentation

For complete details, see:
- **`NEW_LOAN_PHOTO_UPLOAD_COMPLETE_FIX.md`** - Complete guide
- **`fix_photo_upload_complete.sql`** - Detailed SQL script with verification

---

## ✨ What's Fixed

✅ Photo uploads to MRGroups bucket  
✅ Photo URL saved to `customers.photo_url` automatically  
✅ Better error messages  
✅ Enhanced logging for debugging  
✅ RLS policies allow uploads  

**Your photo upload is now fully functional!** 🎊
