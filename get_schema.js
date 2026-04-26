const { createClient } = require('@supabase/supabase-js');

// Use the same Supabase URL and key as in your app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zhohpntqzrcsxihlscah.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpob2hwbnRxenJjc3hpaGxzY2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODc1NTIsImV4cCI6MjA3Mzk2MzU1Mn0.nJXHxhcQRnHTTAuMR5BM0qh9mqw-AHJOxxS_tB16nOw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTableInfo() {
  try {
    // Try to get table structure for customers
    console.log('Fetching customers table structure...');
    
    // This is a workaround to get column information
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .limit(1);

    if (error) {
      console.log('Error fetching customers:', error);
    } else {
      console.log('Customers table sample row:', data[0]);
    }

    // Try to get loans table structure
    console.log('\nFetching loans table structure...');
    
    const { data: loansData, error: loansError } = await supabase
      .from('loans')
      .select('*')
      .limit(1);

    if (loansError) {
      console.log('Error fetching loans:', loansError);
    } else {
      console.log('Loans table sample row:', loansData[0]);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

getTableInfo();