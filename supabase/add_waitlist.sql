-- ═══════════════════════════════════════════════════════════════════════
-- WAITLIST (WISHLIST) TABLE SETUP
-- Run this in the Supabase SQL Editor to enable waitlist capabilities
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  target_firm TEXT,
  timeline TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public insert to waitlist" ON waitlist;
DROP POLICY IF EXISTS "Allow admins all access to waitlist" ON waitlist;

-- Policies
CREATE POLICY "Allow public insert to waitlist" ON waitlist
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admins all access to waitlist" ON waitlist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid()::text AND role = 'admin')
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS waitlist_updated_at ON waitlist;
CREATE TRIGGER waitlist_updated_at BEFORE UPDATE ON waitlist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
