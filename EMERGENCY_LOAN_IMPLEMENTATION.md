# Emergency Loan Page - Implementation Guide

## ✅ Features Implemented

### **1. Emergency Loan Conditions** ✅
The system supports three emergency loan conditions:
- **₹10,000 loan, ₹100 collection** → **10 days limit**
- **₹10,000 loan, ₹200 collection** → **7 days limit**
- **₹10,000 loan, ₹300 collection** → **5 days limit**

### **2. Automatic Expiry & Movement** ✅
- Each emergency loan automatically moves to "Closed Loans" when limit days are exceeded
- System checks loan creation date and calculates days difference
- Checks occur at page load and every hour via interval
- Expired loans are automatically updated to `status = 'closed'`

### **3. Display Layout** ✅
- Team leaders displayed in weekly cards (similar to dashboard batch cards)
- Each card shows:
  - Team Leader Name
  - Emergency Loan Customers (with 🔥 indicator)
  - Loan Amount
  - EMI (calculated)
  - Start Date
  - Remaining Days (countdown)
  - Loan Status (Active / Closed)

### **4. Customer Identification** ✅
- Emergency loan customers highlighted in **red text**
- 🔥 emoji next to customer names
- Alert icon for expiring loans
- Visual distinction between active and closed loans

### **5. Data Filtering & Sorting** ✅
- **Filter**: "All" / "Active" / "Closed" emergency loans
- **Sort by**: 
  - Remaining days (soon-to-expire first)
  - Amount
  - Customer name
  - Team leader
- **Search**: By customer name or team leader

### **6. Notifications** ✅
- Browser notifications show alert 1 day before loan expires
- Notification: "⚠️ Emergency Loan for [Customer Name] is ending tomorrow"
- Permission requested on page load
- Automatic status update on expiry

### **7. UI/UX Enhancements** ✅
- **Card Grid Layout**: Similar to dashboard weekly batches
- **Summary Card**: Shows total, active, and closed emergency loans
- **Progress Bars**: Visual countdown for remaining days (red gradient)
- **Color Coding**:
  - Active loans: Red text for names
  - Closed loans: Gray text with strike-through
  - Countdown badges: Orange (2 days), Red (1 day), Gray (expired)
- **Expandable Cards**: Click to view/hide loan details
- **Loan Detail Modal**: Full loan information on click

### **8. Create Emergency Loan** ✅
- Button at top to create emergency loan
- Modal with instructions
- Directs to use Loan Management page with "Emergency" purpose

## 🎨 Design Features

### **Color Scheme:**
- Background: Soft gray (`bg-gray-50`)
- Active Loans: Red text (`text-red-700`)
- Closed Loans: Gray text with strike-through
- Countdown Badges: 
  - Orange for warning (2 days left)
  - Red for last day
  - Gray for expired

### **Components:**
- ✅ Filter Dropdown → Active / Closed / All
- ✅ Countdown Timer (Remaining days)
- ✅ Customer Detail Modal → Shows full loan info
- ✅ Auto-refresh after moving closed loans
- ✅ Progress Bars (red gradient showing days remaining)
- ✅ Summary Card at top
- ✅ "Create Emergency Loan" button

## 📊 Database Requirements

### **Loans Table:**
The `loans` table should have:
- `loan_purpose` field set to `'emergency'` for emergency loans
- `collection_amount` field (recommended) to store collection amount
  - If not available, system will try to infer from `notes` field
  - Default: ₹100 for ₹10,000 loans

### **Recommended Migration:**
```sql
-- Add collection_amount field to loans table if it doesn't exist
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS collection_amount DECIMAL(10, 2);

-- Add notes field if it doesn't exist
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS notes TEXT;
```

## 🔧 Technical Implementation

### **Key Functions:**

#### **1. Loan Limit Calculation:**
```typescript
const getLoanLimitDays = (loanAmount: number, collectionAmount: number): number => {
  if (loanAmount === 10000) {
    if (collectionAmount === 100) return 10
    if (collectionAmount === 200) return 7
    if (collectionAmount === 300) return 5
  }
  return 10 // Default
}
```

#### **2. Expiry Check:**
```typescript
const checkAndMoveExpiredLoans = async (processedLoans: EmergencyLoanData[]) => {
  const expiredLoans = processedLoans.filter(loan => loan.isExpired && loan.status === 'active')
  // Automatically close expired loans
}
```

#### **3. Notification System:**
```typescript
const checkExpiringLoans = (processedLoans: EmergencyLoanData[]) => {
  const expiringLoans = processedLoans.filter(loan => loan.isExpiringSoon && loan.status === 'active')
  // Show browser notifications
}
```

### **Automatic Refresh:**
- Checks for expired loans every hour
- Checks on page load
- Updates loan status automatically
- Refreshes data after closing expired loans

## 📱 User Experience

### **Workflow:**
1. User opens Emergency Loans page
2. Sees summary of all emergency loans
3. Filters by status (All/Active/Closed)
4. Searches by customer or team leader
5. Sorts by remaining days (soon-to-expire first)
6. Views team leader cards with loan details
7. Expands cards to see all loans for a team leader
8. Clicks customer name to view full loan details
9. Receives notifications for expiring loans
10. System automatically closes expired loans

### **Visual Indicators:**
- 🔥 Fire emoji for emergency loans
- ⏰ Clock icon for countdown
- ✅ Check icon for active loans
- ❌ X icon for closed loans
- Progress bars showing days remaining
- Color-coded countdown badges

## 🚀 Future Enhancements (Optional)

1. **Scheduled Background Jobs**: Use Supabase Edge Functions or cron jobs for automatic expiry checks
2. **Email Notifications**: Send email alerts for expiring loans
3. **SMS Notifications**: Send SMS alerts for critical expiring loans
4. **Export Functionality**: Export emergency loan reports
5. **Advanced Filtering**: Filter by date range, amount range, etc.
6. **Bulk Actions**: Close multiple expired loans at once
7. **Analytics Dashboard**: Track emergency loan trends

## 📝 Notes

- **Collection Amount**: Currently defaults to ₹100 if not stored in database
- **Database Field**: Consider adding `collection_amount` field to loans table for better accuracy
- **Notifications**: Requires browser notification permission
- **Auto-Close**: Happens automatically on page load and every hour
- **Integration**: Works seamlessly with existing Closed Loans page

## ✅ Testing Checklist

- [ ] Emergency loans display correctly
- [ ] Countdown timer works accurately
- [ ] Expired loans automatically close
- [ ] Notifications show for expiring loans
- [ ] Filter by status works
- [ ] Search functionality works
- [ ] Sort by remaining days works (soon-to-expire first)
- [ ] Team leader cards display correctly
- [ ] Loan detail modal shows all information
- [ ] Progress bars display correctly
- [ ] Create Emergency Loan button works
- [ ] Summary statistics are accurate
- [ ] Customer names highlighted in red
- [ ] Closed loans show with strike-through

---

**Status**: ✅ **COMPLETED**
**Component**: `src/components/EmergencyLoan.tsx`
**Integration**: Already integrated in `src/app/page.tsx`
**Date**: January 2025
