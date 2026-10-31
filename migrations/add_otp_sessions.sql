-- Migration: Create OTP sessions table for secure WhatsApp OTP storage
-- This replaces in-memory OTP storage (which breaks across serverless instances)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS otp_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mobile VARCHAR(15) NOT NULL,
  otp_hash VARCHAR(64) NOT NULL,          -- SHA-256 hash of OTP (never store plain text)
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast mobile lookup
CREATE INDEX IF NOT EXISTS idx_otp_sessions_mobile ON otp_sessions(mobile);

-- Auto-cleanup old/expired sessions (older than 1 hour)
-- Optional: run as a cron or use Supabase scheduled functions
-- DELETE FROM otp_sessions WHERE expires_at < NOW() - INTERVAL '1 hour';

-- Disable RLS for this table (it is server-side only, accessed via service key)
ALTER TABLE otp_sessions DISABLE ROW LEVEL SECURITY;

