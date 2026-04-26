    -- MR Groups - Supabase schema (FIXED VERSION - NO ENUMS)
    -- Run in Supabase SQL editor
    -- IMPORTANT: This version uses VARCHAR instead of ENUM types to avoid type casting issues

    -- Extensions
    create extension if not exists "pgcrypto";
    create extension if not exists "uuid-ossp";

    -- Users (app roles) - SIMPLIFIED
    create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    name varchar(255) not null,
    email varchar(255) unique not null,
    password_hash varchar(255),
    role varchar(20) not null default 'staff', -- Changed to varchar
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
    );
    create index if not exists idx_users_email on users(email);

    -- Employees (workers/team leaders) - ID is custom like 'TL001'
    create table if not exists employees (
    id varchar(32) primary key,
    name varchar(255) not null,
    email varchar(255),
    phone varchar(20),
    designation varchar(100),
    department varchar(100),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_employees_email unique (email)
    );
    create index if not exists idx_employees_email on employees(email);
    create index if not exists idx_employees_phone on employees(phone);

    -- Customers
    create table if not exists customers (
    id uuid primary key default gen_random_uuid(),
    customer_id_display varchar(32), -- optional human-friendly code
    name varchar(255) not null,
    phone varchar(20) not null,
    address text,
    relationship varchar(24), -- e.g., Husband/Wife/... keep flexible
    aadhaar_number varchar(20),
    pan_number varchar(15),
    additional_mobile_1 varchar(20),
    additional_mobile_1_relationship varchar(24),
    additional_mobile_2 varchar(20),
    additional_mobile_2_relationship varchar(24),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_customers_phone unique (phone),
    constraint uq_customers_display_id unique (customer_id_display)
    );
    create index if not exists idx_customers_aadhaar on customers(aadhaar_number);
    create index if not exists idx_customers_pan on customers(pan_number);
    create index if not exists idx_customers_name on customers(name);

    -- Loans (FIXED: interest_rate as VARCHAR to match app code)
    -- IMPORTANT: Drop and recreate if exists to ensure clean state
    DROP TABLE IF EXISTS loans CASCADE;

    create table loans (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references customers(id) on delete cascade,
    amount numeric(12,2) not null,
    status varchar(20) not null default 'active', -- Changed to varchar to avoid enum issues
    start_date date not null,
    end_date date,
    interest_rate varchar(20), -- CHANGED: was numeric(5,2), now varchar(20) to match app
    number_of_weeks integer,
    team_leader_id varchar(32) references employees(id) on delete set null,
    weekly_batch varchar(20), -- Changed to varchar to avoid enum issues
    loan_purpose varchar(255),
    customer_bank_name varchar(255),
    account_number varchar(50),
    ifsc_code varchar(20),
    created_at timestamptz not null default now()
    );
    create index if not exists idx_loans_customer on loans(customer_id);
    create index if not exists idx_loans_status on loans(status);
    create index if not exists idx_loans_start_date on loans(start_date);
    create index if not exists idx_loans_team_leader on loans(team_leader_id);
    create index if not exists idx_loans_weekly_batch on loans(weekly_batch);

    -- Emergency Loans (NEW: for short-term emergency loans)
    DROP TABLE IF EXISTS emergency_loans CASCADE;

    create table emergency_loans (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references customers(id) on delete cascade,
    customer_name varchar(255) not null,
    mobile_number varchar(20) not null,
    address text,
    additional_mobile_1 varchar(20),
    additional_mobile_1_relationship varchar(50),
    additional_mobile_2 varchar(20),
    additional_mobile_2_relationship varchar(50),
    team_leader_id varchar(32) references employees(id) on delete set null,
    loan_amount numeric(12,2) not null,
    due_amount numeric(12,2) not null,
    number_of_days integer not null,
    start_date date not null,
    end_date date not null,
    status varchar(20) not null default 'active',
    created_at timestamptz not null default now()
    );
    create index if not exists idx_emergency_loans_customer on emergency_loans(customer_id);
    create index if not exists idx_emergency_loans_mobile on emergency_loans(mobile_number);
    create index if not exists idx_emergency_loans_status on emergency_loans(status);
    create index if not exists idx_emergency_loans_team_leader on emergency_loans(team_leader_id);
    create index if not exists idx_emergency_loans_start_date on emergency_loans(start_date);

    -- Collections (daily) - SIMPLIFIED: using varchar instead of enums
    DROP TABLE IF EXISTS collections CASCADE;

    create table collections (
    id uuid primary key default gen_random_uuid(),
    loan_id uuid not null references loans(id) on delete cascade,
    customer_id uuid not null references customers(id) on delete cascade,
    worker_id varchar(32) references employees(id) on delete set null,
    amount_collected numeric(12,2) not null,
    remaining_balance numeric(12,2) not null,
    collection_date date not null,
    status varchar(20) not null default 'completed', -- Changed to varchar
    notes text,
    created_at timestamptz not null default now()
    );
    create index if not exists idx_collections_loan on collections(loan_id);
    create index if not exists idx_collections_customer on collections(customer_id);
    create index if not exists idx_collections_worker on collections(worker_id);
    create index if not exists idx_collections_date on collections(collection_date);

    -- Repayments (optional detailed payments log separate from collections)
    create table if not exists repayments (
    id uuid primary key default gen_random_uuid(),
    loan_id uuid not null references loans(id) on delete cascade,
    amount_paid numeric(12,2) not null,
    payment_date date not null,
    payment_method varchar(50),
    notes text,
    created_at timestamptz not null default now()
    );
    create index if not exists idx_repayments_loan on repayments(loan_id);
    create index if not exists idx_repayments_date on repayments(payment_date);

    -- Batches (weekly groups)  
    create table if not exists batches (
    id uuid primary key default gen_random_uuid(),
    name varchar(100) not null,
    batch_date date not null,
    total_collection numeric(12,2) not null default 0,
    customer_count integer not null default 0,
    created_by varchar(32) references employees(id) on delete set null,
    created_at timestamptz not null default now()
    );
    create index if not exists idx_batches_date on batches(batch_date);

    -- Batch-Customers (membership and summary per batch) - SIMPLIFIED
    DROP TABLE IF EXISTS batch_customers CASCADE;

    create table batch_customers (
    id uuid primary key default gen_random_uuid(),
    batch_id uuid not null references batches(id) on delete cascade,
    customer_id uuid not null references customers(id) on delete cascade,
    loan_id uuid not null references loans(id) on delete cascade,
    amount_paid numeric(12,2) not null default 0,
    balance numeric(12,2) not null default 0,
    status varchar(20) not null default 'unpaid', -- Changed to varchar
    created_at timestamptz not null default now(),
    constraint uq_batch_customer unique (batch_id, customer_id, loan_id)
    );
    create index if not exists idx_batch_customers_batch on batch_customers(batch_id);
    create index if not exists idx_batch_customers_customer on batch_customers(customer_id);
    create index if not exists idx_batch_customers_loan on batch_customers(loan_id);

    -- Pending customers tracker (used by dashboard/collections workflow)
    create table if not exists pending_customers (
    id uuid primary key default gen_random_uuid(),
    loan_id uuid not null references loans(id) on delete cascade,
    pending_count integer not null default 0,
    emi_amount numeric(12,2) not null default 0,
    checked boolean not null default false,
    checked_at timestamptz,
    created_at timestamptz not null default now(),
    constraint uq_pending_customers_loan unique (loan_id)
    );
    create index if not exists idx_pending_customers_checked on pending_customers(checked);
    create index if not exists idx_pending_customers_loan on pending_customers(loan_id);

    -- Collected customers log (for "marked collected" actions)
    create table if not exists collected_customers (
    id uuid primary key default gen_random_uuid(),
    loan_id uuid not null references loans(id) on delete cascade,
    customer_id uuid not null references customers(id) on delete cascade,
    worker_id varchar(32) references employees(id) on delete set null,
    amount_collected numeric(12,2) not null default 0,
    collection_date date not null default (now()::date),
    notes text,
    created_at timestamptz not null default now()
    );
    create index if not exists idx_collected_customers_loan on collected_customers(loan_id);
    create index if not exists idx_collected_customers_customer on collected_customers(customer_id);
    create index if not exists idx_collected_customers_date on collected_customers(collection_date);

    -- Emergency Collections (for tracking emergency loan collections)
    DROP TABLE IF EXISTS emergency_collections CASCADE;

    create table emergency_collections (
    id uuid primary key default gen_random_uuid(),
    emergency_loan_id uuid not null references emergency_loans(id) on delete cascade,
    customer_id uuid not null references customers(id) on delete cascade,
    worker_id varchar(32) references employees(id) on delete set null,
    amount_collected numeric(12,2) not null,
    remaining_balance numeric(12,2) not null,
    collection_date date not null,
    status varchar(20) not null default 'completed',
    notes text,
    created_at timestamptz not null default now()
    );
    create index if not exists idx_emergency_collections_loan on emergency_collections(emergency_loan_id);
    create index if not exists idx_emergency_collections_customer on emergency_collections(customer_id);
    create index if not exists idx_emergency_collections_worker on emergency_collections(worker_id);
    create index if not exists idx_emergency_collections_date on emergency_collections(collection_date);

    -- DISABLE RLS FOR DEVELOPMENT (Important for testing)
    ALTER TABLE users DISABLE ROW LEVEL SECURITY;
    ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
    ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
    ALTER TABLE loans DISABLE ROW LEVEL SECURITY;
    ALTER TABLE emergency_loans DISABLE ROW LEVEL SECURITY;
    ALTER TABLE collections DISABLE ROW LEVEL SECURITY;
    ALTER TABLE emergency_collections DISABLE ROW LEVEL SECURITY;
    ALTER TABLE repayments DISABLE ROW LEVEL SECURITY;
    ALTER TABLE batches DISABLE ROW LEVEL SECURITY;
    ALTER TABLE batch_customers DISABLE ROW LEVEL SECURITY;
    ALTER TABLE pending_customers DISABLE ROW LEVEL SECURITY;
    ALTER TABLE collected_customers DISABLE ROW LEVEL SECURITY;

    -- Insert sample team leaders
    INSERT INTO employees (id, name, email, phone, designation) VALUES
    ('TL001', 'Rajesh Kumar', 'rajesh.kumar@company.com', '9876543210', 'Team Leader'),
    ('TL002', 'Priya Sharma', 'priya.sharma@company.com', '9876543211', 'Team Leader'),
    ('TL003', 'Amit Patel', 'amit.patel@company.com', '9876543212', 'Team Leader')
    ON CONFLICT (id) DO NOTHING;

    -- Verify setup
    SELECT 'Database setup completed!' as message;
    SELECT 'Employees created: ' || COUNT(*)::text as status FROM employees;
