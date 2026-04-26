// Database setup script for Supabase
// Run this script to set up your database tables

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // You'll need to add this to your .env.local

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env.local file.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  try {
    console.log('Setting up database...')
    
    // Read the SQL schema file
    const schema = fs.readFileSync('database-schema.sql', 'utf8')
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.error('Error executing statement:', error)
          // Continue with other statements
        }
      }
    }
    
    console.log('Database setup completed!')
  } catch (error) {
    console.error('Error setting up database:', error)
  }
}

// Alternative method using direct SQL execution
async function setupDatabaseDirect() {
  try {
    console.log('Setting up database using direct SQL...')
    
    // Read the SQL schema file
    const schema = fs.readFileSync('database-schema.sql', 'utf8')
    
    // Execute the entire schema
    const { error } = await supabase.rpc('exec', { sql: schema })
    
    if (error) {
      console.error('Error executing schema:', error)
    } else {
      console.log('Database setup completed!')
    }
  } catch (error) {
    console.error('Error setting up database:', error)
  }
}

// Run the setup
setupDatabase()
