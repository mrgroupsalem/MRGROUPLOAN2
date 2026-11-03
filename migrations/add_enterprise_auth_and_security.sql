-- ============================================================================
-- Enterprise Authentication, Admin Role Authorization, Audit Logging & RLS
-- ============================================================================

-- 1. Create table for Authorized Admin Users
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    last_password_change_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);

-- 2. Create Security Audit Logs Table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'login_success', 'login_failure', 'logout', 'password_change', 'password_reset_request', 'email_verification'
    user_email TEXT NOT NULL,
    user_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb, -- NEVER store passwords, hashes, tokens, or OTPs
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON public.security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_email ON public.security_audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON public.security_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the requesting user is an active admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND is_active = true
  );
$$;

-- Helper function to check if an email is an authorized admin
CREATE OR REPLACE FUNCTION public.is_authorized_admin_email(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE LOWER(email) = LOWER(check_email) AND is_active = true
  );
$$;

-- RLS Policies for admin_users
DROP POLICY IF EXISTS "Admins can view admin accounts" ON public.admin_users;
CREATE POLICY "Admins can view admin accounts"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update their own profile" ON public.admin_users;
CREATE POLICY "Admins can update their own profile"
    ON public.admin_users
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid() AND public.is_admin())
    WITH CHECK (id = auth.uid() AND public.is_admin());

-- RLS Policies for security_audit_logs
DROP POLICY IF EXISTS "Admins can view security logs" ON public.security_audit_logs;
CREATE POLICY "Admins can view security logs"
    ON public.security_audit_logs
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Service role and authenticated can insert audit logs" ON public.security_audit_logs;
CREATE POLICY "Service role and authenticated can insert audit logs"
    ON public.security_audit_logs
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Enable RLS on core financial tables
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;

-- Admin access policies for core financial tables
DROP POLICY IF EXISTS "Admins full access to customers" ON public.customers;
CREATE POLICY "Admins full access to customers"
    ON public.customers
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins full access to loans" ON public.loans;
CREATE POLICY "Admins full access to loans"
    ON public.loans
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins full access to collections" ON public.collections;
CREATE POLICY "Admins full access to collections"
    ON public.collections
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins full access to employees" ON public.employees;
CREATE POLICY "Admins full access to employees"
    ON public.employees
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

