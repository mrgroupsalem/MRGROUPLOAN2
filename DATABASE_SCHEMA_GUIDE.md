# 📊 MR Groups Database Schema - Complete Guide

## 🚀 Quick Start

### **Run This Single SQL Script**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy entire content of: **`mr-groups-complete-schema.sql`**
3. Paste into SQL Editor
4. Click **"Run"**
5. ✅ Done! Your database is ready!

---

## 📋 What's Included

### **Core Tables (13 Total)**

#### **Authentication & Users**
1. **`users`** - App users with roles (admin/staff)
2. **`employees`** - Workers & Team Leaders (IDs: TL001, TL002, etc.)

#### **Customer Management**
3. **`customers`** - Customer details with **photo_url** field ✅
   - Includes: photo upload support, additional mobiles, relationships
   - Tracks: `created_by` user for accountability

#### **Loan Management**
4. **`loans`** - Regular loan applications
   - Fields: amount, interest_rate, weeks, batch, team_leader
   - Status: active, closed, pending
   
5. **`emergency_loans`** - Short-term emergency loans (5-10 days)
   - Quick approval, short duration
   - Separate tracking from regular loans

#### **Collections & Payments**
6. **`collections`** - Daily collection tracking for regular loans
7. **`emergency_collections`** - Collections for emergency loans
8. **`repayments`** - Detailed payment logs (optional)

#### **Batch Management**
9. **`batches`** - Weekly collection groups (Tuesday/Thursday/Friday)
10. **`batch_customers`** - Links customers to batches
11. **`pending_customers`** - Tracks pending payments in collections workflow
12. **`collected_customers`** - Logs when payments are collected

---

## ✨ Key Features

### **Photo Upload Support** ✅
```sql
-- customers table includes:
photo_url TEXT  -- Stores Supabase Storage URL
```

Photo automatically saved when uploaded via:
- `/new-loan` page
- Regular Loan Application modal

### **Team Leader Tracking** ✅
```sql
team_leader_id VARCHAR(32) REFERENCES employees(id)
```

Every loan tracks which Team Leader handled it.

### **Created By Tracking** ✅
```sql
created_by UUID REFERENCES users(id)
```

Knows which user created each customer record.

### **Dual Loan System** ✅
- **Regular Loans**: Long-term (15-20 weeks)
- **Emergency Loans**: Short-term (5-10 days)

Both have separate collection tracking.

### **Weekly Batch System** ✅
```sql
weekly_batch VARCHAR(20) CHECK (weekly_batch IN ('tuesday', 'thursday', 'friday'))
```

Organizes collections by day of week.

---

## 🔧 Important Configuration

### **VARCHAR Instead of ENUM**
All status fields use VARCHAR instead of PostgreSQL ENUM types to avoid type-casting issues in TypeScript/JavaScript code.

**Example:**
```sql
status VARCHAR(20) CHECK (status IN ('active', 'closed', 'pending'))
```

This allows easy updates without database migrations.

### **RLS Disabled for Development**
```sql
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
```

**Important:** Enable RLS in production with proper policies for security.

---

## 📊 Sample Data Included

The script automatically creates 4 Team Leaders:
- **TL001** - Rajesh Kumar
- **TL002** - Priya Sharma (Senior TL)
- **TL003** - Amit Patel
- **TL004** - Sunita Singh

You can add more employees/customers after running the script.

---

## 🔍 Verification Queries

After running the schema, verify everything was created:

### **Check All Tables**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### **Verify Photo Upload Column**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name = 'photo_url';
```

Should return: `photo_url | text`

### **Check Employees**
```sql
SELECT id, name, designation FROM employees;
```

Should show 4 team leaders.

---

## 🎯 Common Operations

### **Add New Employee**
```sql
INSERT INTO employees (id, name, email, phone, designation)
VALUES ('TL005', 'New Employee', 'email@mrgroups.com', '9999999999', 'Team Leader');
```

### **View Customer with Photo**
```sql
SELECT 
    id,
    name,
    phone,
    photo_url,
    created_at
FROM customers
WHERE photo_url IS NOT NULL
ORDER BY created_at DESC;
```

### **View Loan with Customer Photo**
```sql
SELECT 
    l.id AS loan_id,
    l.amount,
    l.status,
    c.name AS customer_name,
    c.photo_url,
    e.name AS team_leader_name
FROM loans l
JOIN customers c ON l.customer_id = c.id
LEFT JOIN employees e ON l.team_leader_id = e.id
ORDER BY l.created_at DESC;
```

### **Track Collections by Date**
```sql
SELECT 
    c.collection_date,
    COUNT(*) AS total_collections,
    SUM(c.amount_collected) AS total_amount
FROM collections c
WHERE c.collection_date >= NOW() - INTERVAL '7 days'
GROUP BY c.collection_date
ORDER BY c.collection_date DESC;
```

---

## 🐛 Troubleshooting

### **Issue: "relation already exists"**
**Solution:** The tables already exist. Either:
1. Drop existing tables first (WARNING: deletes all data!)
   ```sql
   DROP TABLE IF EXISTS table_name CASCADE;
   ```
2. Or skip running the script if you already have data

### **Issue: "permission denied"**
**Solution:** Make sure you're logged in as Supabase admin/owner

### **Issue: Photo upload still not working**
**Solution:** Run the photo upload fix script separately:
- File: `fix_photo_upload_complete.sql`
- Adds `photo_url` column if missing
- Creates RLS policies for storage bucket

---

## 📁 Related Files

### **Schema Files**
- **`mr-groups-complete-schema.sql`** ⭐ USE THIS ONE - Complete, latest schema
- `database-schema.sql` - Older version (reference only)
- `supabase-schema-fixed.sql` - Older version (reference only)

### **Fix Scripts**
- **`fix_photo_upload_complete.sql`** - Photo upload specific fixes
- `fix_storage_upload_simple.sql` - Storage bucket permissions
- `fix_rls_policies.sql` - General RLS policy fixes

### **Documentation**
- `QUICK_FIX_PHOTO_UPLOAD.md` - 5-minute photo upload fix
- `NEW_LOAN_PHOTO_UPLOAD_COMPLETE_FIX.md` - Complete photo upload guide
- `STORAGE_RLS_FIX_GUIDE.md` - RLS policy troubleshooting

---

## 🎯 Next Steps After Running Schema

1. ✅ **Run the schema** in Supabase SQL Editor
2. ✅ **Verify tables** were created (check verification queries)
3. ✅ **Create MRGroups bucket** in Storage section
4. ✅ **Run photo upload fix** if needed (`fix_photo_upload_complete.sql`)
5. ✅ **Test loan application** with photo upload
6. ✅ **Verify photo saves** to database and bucket

---

## 🔒 Production Security Checklist

Before deploying to production:

- [ ] Enable RLS on all tables
- [ ] Create proper RLS policies for each table
- [ ] Set up authentication properly
- [ ] Configure storage bucket permissions
- [ ] Test with authenticated users only
- [ ] Remove sample data
- [ ] Set up backups
- [ ] Monitor query performance

---

## 📞 Support

If you encounter issues:

1. Check browser console (F12) for errors
2. Verify Supabase environment variables are set
3. Check that MRGroups bucket exists in Storage
4. Run verification queries above
5. Review related documentation files

---

## 🎉 Summary

Your MR Groups database now has:

✅ **13 tables** covering all business needs  
✅ **Photo upload support** with Supabase Storage  
✅ **Employee tracking** with custom IDs  
✅ **Dual loan system** (regular + emergency)  
✅ **Collection management** with workflow tracking  
✅ **Batch organization** by weekday  
✅ **Complete audit trail** with created_by tracking  
✅ **Sample data** for immediate testing  

**Database is ready to use!** 🚀
