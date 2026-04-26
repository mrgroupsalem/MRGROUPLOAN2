# 🎯 Quick Reference: Photo Upload Auto-Sync

## ✨ What Changed

Photo URLs now **automatically save to BOTH `customers` AND `loans` tables**!

---

## 🔧 Database Changes

### **Tables Updated:**

**1. `loans` table**
```sql
ALTER TABLE loans ADD COLUMN photo_url TEXT;
```

**2. `emergency_loans` table**
```sql
ALTER TABLE emergency_loans ADD COLUMN photo_url TEXT;
```

### **Triggers Created:**

**Trigger 1: Auto-Copy on Loan Creation**
- Fires when: INSERT or UPDATE on `loans`
- Action: Copies `customer.photo_url` → `loan.photo_url`

**Trigger 2: Sync on Customer Photo Update**
- Fires when: UPDATE `customer.photo_url`
- Action: Updates ALL customer's loans with new photo

---

## 🚀 How to Use

### **In Your Code (Frontend):**

```typescript
// OLD WAY (Manual):
await supabase.from('customers').insert({ photo_url: url });
await supabase.from('loans').insert({ photo_url: url }); // ❌ Manual

// NEW WAY (Automatic):
await supabase.from('customers').insert({ photo_url: url });
await supabase.from('loans').insert({ customer_id: id }); 
// ✅ photo_url auto-copied by trigger!
```

### **What You Need to Do:**

**NOTHING!** It's automatic! ✅

Just keep saving photo to customer like before:
```typescript
customerData.photo_url = uploadedPhotoUrl;
```

Loan will automatically get it! 🎉

---

## 📊 Verification

Run this SQL to check everything works:

```sql
-- Check columns exist
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'photo_url' 
AND table_schema = 'public';

-- Should show:
-- customers       | photo_url
-- loans           | photo_url
-- emergency_loans | photo_url
```

---

## 🧪 Test It

```sql
-- 1. Create customer with photo
INSERT INTO customers (name, phone, photo_url)
VALUES ('Test User', '9999999999', 'https://example.com/photo.jpg');

-- 2. Create loan for customer
INSERT INTO loans (customer_id, amount, start_date, end_date)
VALUES (
  (SELECT id FROM customers WHERE phone = '9999999999'),
  50000,
  '2026-03-11',
  '2026-07-11'
);

-- 3. Check if photo was auto-copied
SELECT 
  c.name,
  c.photo_url AS customer_photo,
  l.id AS loan_id,
  l.photo_url AS loan_photo
FROM loans l
JOIN customers c ON l.customer_id = c.id;

-- ✅ Both should have same photo URL!
```

---

## 🎯 Benefits

| Before | After |
|--------|-------|
| Save photo to customer manually | Same as before |
| **Also save to loan manually** ❌ | **Auto-saves to loan** ✅ |
| Can get out of sync | Always in sync |
| More code | Less code |

---

## 📋 Files Modified

1. **`mr-groups-complete-schema.sql`** ⭐ Main file
   - Added `photo_url` to loans & emergency_loans
   - Created auto-copy triggers
   - Added indexes for performance

2. **`AUTO_PHOTO_SYNC_GUIDE.md`** - Complete guide

3. **This file** - Quick reference

---

## ✅ Summary

**What changed:**
- ✅ `loans` table has `photo_url` column
- ✅ `emergency_loans` table has `photo_url` column  
- ✅ Triggers auto-copy from customer to loans
- ✅ Indexes added for fast lookups

**What you need to do:**
- ✅ Run updated schema in Supabase
- ✅ Keep coding the same way
- ✅ Triggers handle the rest!

**Result:**
- ✅ Photos saved to both tables automatically
- ✅ Data always consistent
- ✅ Simpler code!

🎉 **It just works!**
