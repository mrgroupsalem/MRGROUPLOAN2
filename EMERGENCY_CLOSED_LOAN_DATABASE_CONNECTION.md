# Emergency Loan and Closed Loan Database Connection

## ✅ Completed Changes

### 1. Database Tables Created
- **`emergency_loans`** table - Stores all emergency loan data
- **`closed_loans`** table - Stores all closed loan records (both emergency and regular loans)

Location: `supabase/migrations/20250104_create_emergency_closed_loan_tables.sql`

### 2. Component Updates

#### EmergencyLoanApplication.tsx
- ✅ Updated to insert new emergency loans into `emergency_loans` table instead of `loans` table
- ✅ Uses proper UUID for `customer_id` foreign key
- ✅ Stores `due_amount`, `number_of_days`, and other emergency-specific fields

#### EmergencyLoan.tsx
- ✅ Updated to query from `emergency_loans` table
- ✅ Maps emergency loan data to Loan interface for compatibility
- ✅ Automatic expiry detection and movement to `closed_loans` table
- ✅ Uses `due_amount` and `number_of_days` from database

#### ClosedLoans.tsx
- ✅ Updated to query from `closed_loans` table
- ✅ Displays both emergency and regular closed loans
- ✅ Properly maps database fields to display format

## 📋 Database Schema

### Emergency Loans Table
```sql
emergency_loans:
  - id (UUID, Primary Key)
  - customer_id (UUID, Foreign Key to customers)
  - customer_id_display (VARCHAR)
  - loan_amount (DECIMAL)
  - due_amount (DECIMAL) - Daily collection amount
  - number_of_days (INTEGER) - Loan duration
  - start_date (DATE)
  - end_date (DATE)
  - team_leader_id (VARCHAR(20), Foreign Key to employees)
  - status (active/closed/pending)
  - notes (TEXT)
  - created_at, updated_at
```

### Closed Loans Table
```sql
closed_loans:
  - id (UUID, Primary Key)
  - loan_id (UUID, Optional reference to original loans table)
  - customer_id (UUID, Foreign Key to customers)
  - customer_id_display, customer_name (Denormalized for history)
  - loan_amount, interest_rate
  - total_amount_paid, balance_at_closure
  - start_date, end_date, closure_date
  - team_leader_id, team_leader_name (Denormalized)
  - loan_purpose, weekly_batch
  - closure_reason, notes
  - created_at, updated_at
```

## 🔄 Data Flow

### Creating Emergency Loan
1. User fills form in `EmergencyLoanApplication`
2. Customer created/updated in `customers` table
3. Emergency loan inserted into `emergency_loans` table
4. Success callback refreshes data

### Viewing Emergency Loans
1. `EmergencyLoan` component queries `emergency_loans` table
2. Joins with `customers` and `employees` tables
3. Calculates remaining days and expiry status
4. Displays loans grouped by team leader

### Closing Emergency Loans
1. System detects expired loans (end_date passed)
2. Moves loan data to `closed_loans` table with:
   - All loan details
   - Denormalized customer/team leader names
   - Closure reason: "Automatically closed - Loan period expired"
3. Deletes from `emergency_loans` table after successful transfer

### Viewing Closed Loans
1. `ClosedLoans` component queries `closed_loans` table
2. Shows both emergency and regular closed loans
3. Supports filtering and sorting

## 🚀 Next Steps

### To Deploy:
1. Run the migration in Supabase SQL Editor:
   ```sql
   -- Run: supabase/migrations/20250104_create_emergency_closed_loan_tables.sql
   ```

2. **Optional**: Migrate existing emergency loans from `loans` table:
   ```sql
   -- Run this after creating the tables to migrate existing data
   INSERT INTO emergency_loans (
     customer_id, customer_id_display, loan_amount, 
     due_amount, number_of_days, start_date, end_date,
     team_leader_id, status, notes, created_at
   )
   SELECT 
     c.id as customer_id,
     l.customer_id as customer_id_display,
     l.amount as loan_amount,
     COALESCE(l.collection_amount, 100) as due_amount,
     CASE 
       WHEN l.amount = 10000 AND l.collection_amount = 100 THEN 10
       WHEN l.amount = 10000 AND l.collection_amount = 200 THEN 7
       WHEN l.amount = 10000 AND l.collection_amount = 300 THEN 5
       ELSE 10
     END as number_of_days,
     l.start_date,
     l.end_date,
     l.team_leader_id,
     l.status,
     l.notes,
     l.created_at
   FROM loans l
   LEFT JOIN customers c ON l.customer_id = c.customer_id_display OR l.customer_id = c.phone
   WHERE l.loan_purpose = 'emergency';
   ```

3. **Optional**: Migrate existing closed loans:
   ```sql
   INSERT INTO closed_loans (
     loan_id, customer_id, customer_id_display, customer_name,
     loan_amount, interest_rate, start_date, end_date,
     closure_date, team_leader_id, team_leader_name,
     loan_purpose, weekly_batch, notes, created_at
   )
   SELECT 
     l.id as loan_id,
     c.id as customer_id,
     l.customer_id as customer_id_display,
     c.name as customer_name,
     l.amount as loan_amount,
     COALESCE(l.interest_rate::DECIMAL, 0) as interest_rate,
     l.start_date,
     l.end_date,
     CURRENT_DATE as closure_date,
     l.team_leader_id,
     e.name as team_leader_name,
     l.loan_purpose,
     l.weekly_batch,
     l.notes,
     l.created_at
   FROM loans l
   LEFT JOIN customers c ON l.customer_id = c.customer_id_display OR l.customer_id = c.phone
   LEFT JOIN employees e ON l.team_leader_id = e.id
   WHERE l.status = 'closed';
   ```

## ⚠️ Important Notes

1. **Team Leader ID**: Uses `VARCHAR(20)` to match your `employees` table structure
2. **Customer ID**: Uses UUID from `customers.id` for foreign key relationship
3. **Data Migration**: Existing emergency loans in `loans` table won't automatically migrate - use the optional migration scripts above
4. **Collection Amount**: Emergency loans use `due_amount` field instead of `collection_amount`

## 🔍 Testing Checklist

- [ ] Create new emergency loan - should save to `emergency_loans` table
- [ ] View emergency loans - should load from `emergency_loans` table
- [ ] Expired loans - should automatically move to `closed_loans` table
- [ ] View closed loans - should show from `closed_loans` table
- [ ] Check foreign key relationships work correctly
- [ ] Verify RLS policies allow access

## 📝 Future Enhancements

1. Add collection tracking for emergency loans
2. Calculate `total_amount_paid` when moving to closed_loans
3. Add manual closure option for emergency loans
4. Add migration tool to move existing loans
5. Add closed loan details view

