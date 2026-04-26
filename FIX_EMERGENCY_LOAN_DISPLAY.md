# Fix for Emergency Loan Not Appearing

## Issues Fixed:

1. ✅ **EmergencyLoan component now properly loads from `emergency_loans` table**
   - Simplified query to avoid foreign key join issues
   - Manual joins for customer and team leader data
   - Proper data mapping to Loan interface

2. ✅ **Create Emergency Loan modal integrated**
   - Replaced placeholder modal with actual `EmergencyLoanApplication` component
   - Automatic data refresh after loan creation
   - Refresh on both success and close

3. ✅ **Data refresh mechanism**
   - `loadData()` is called when:
     - Component mounts
     - Emergency loan is created successfully
     - Modal closes
     - Expired loans are moved

## Testing Steps:

1. Navigate to Emergency Loan page
2. Click "Create Emergency Loan" button
3. Fill in the form and submit
4. The new emergency loan should immediately appear in the list
5. If it doesn't appear, check browser console for errors

## If Emergency Loans Still Don't Appear:

1. **Check database connection:**
   - Verify `emergency_loans` table exists
   - Check RLS policies allow read access

2. **Check browser console:**
   - Look for any Supabase errors
   - Check if data is being loaded but not displayed

3. **Verify data format:**
   - Emergency loans should have:
     - `loan_amount` (not `amount`)
     - `due_amount` (not `collection_amount`)
     - `number_of_days`
     - `customer_id` (UUID)
     - `team_leader_id` (VARCHAR)

4. **Manual test query:**
   ```sql
   SELECT * FROM emergency_loans ORDER BY created_at DESC LIMIT 5;
   ```

## Next Steps for Regular Loans:

Regular loans from `loans` table should also move to `closed_loans` when closed. This needs to be added to:
- Collections.tsx (when loan balance reaches 0)
- Dashboard.tsx (when closing loans)
- Any other places where loans are marked as closed

