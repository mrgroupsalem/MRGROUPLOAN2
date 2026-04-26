# Supabase Database Setup Instructions

## Prerequisites
1. A Supabase project created at [supabase.com](https://supabase.com)
2. Your project URL and anon key (already in env-setup.txt)

## Setup Steps

### 1. Environment Variables
Create a `.env.local` file in your project root with the following content:

```env
NEXT_PUBLIC_SUPABASE_URL=https://hrarjtvxeuuubclbkevz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyYXJqdHZ4ZXV1dWJjbGJrZXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMTg4NjAsImV4cCI6MjA4MzY5NDg2MH0.rIWnH90iZ_F-hmJok3UixdJCSdzCBkJh7ysU1U36wXE
```

### 2. Database Schema Setup

#### Option A: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `database-schema.sql`
4. Paste and run the SQL script

#### Option B: Using the Setup Script
1. Install dependencies:
   ```bash
   npm install dotenv
   ```
2. Add your service role key to `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
3. Run the setup script:
   ```bash
   node setup-database.js
   ```

### 3. Verify Setup
After running the schema, you should have the following tables:
- `users` - User accounts
- `customers` - Customer information
- `employees` - Employee/worker information
- `loans` - Loan records
- `collections` - Collection records
- `repayments` - Repayment records
- `batches` - Weekly batch information
- `batch_customers` - Batch-customer relationships

### 4. Sample Data
The schema includes sample data for testing:
- 2 users (admin and staff)
- 5 customers
- 4 employees (team leaders)
- 5 loans with different weekly batches

### 5. Row Level Security (RLS)
The database is configured with RLS policies that allow:
- Staff to view all data
- Staff to insert/update records
- Proper data isolation

## Testing the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Collections page
3. You should see data loaded from Supabase instead of localStorage
4. Try creating a collection to test the database connection

## Troubleshooting

### Common Issues:
1. **Connection Error**: Check your environment variables
2. **Permission Denied**: Verify RLS policies are set up correctly
3. **Missing Tables**: Ensure the schema was executed completely

### Getting Help:
- Check the Supabase dashboard for error logs
- Verify your project settings
- Ensure your API keys are correct

## Next Steps

Once the database is set up:
1. The Collections page will automatically use Supabase
2. All data will be persisted in the cloud
3. You can add more features like real-time updates
4. Set up authentication if needed
