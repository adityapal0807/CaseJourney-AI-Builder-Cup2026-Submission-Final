-- CaseJourney Database Schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL Editor to set up your database

-- ═══════════════════════════════════════════════════════════════════════
-- Enable UUID extension
-- ═══════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════
-- 1. USERS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id TEXT UNIQUE NOT NULL,              -- Supabase auth.users.id
  name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_role ON users(role);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. CASES
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),

  -- Basic info
  name TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  case_type TEXT NOT NULL,
  industry TEXT NOT NULL,
  company_style TEXT NOT NULL,
  round TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  tags TEXT[] NOT NULL DEFAULT '{}',

  -- Coaching notes
  clarifying_questions TEXT,
  brownie_points TEXT,
  keep_in_mind TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cases_author ON cases(author_id);
CREATE INDEX idx_cases_status ON cases(status);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. CASE TURNS (Flow Builder)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS case_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('interviewer', 'candidate', 'system')),
  dialogue_text TEXT NOT NULL DEFAULT '',

  -- JSON columns for complex nested data
  canvas_triggers JSONB NOT NULL DEFAULT '[]',
  exhibit_reveal JSONB,                       -- nullable

  -- Scoring (candidate turns only)
  scoring_dimension TEXT,
  scoring_weight NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_turns_case ON case_turns(case_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 4. FRAMEWORK NODES (Framework Tree)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS framework_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  framework TEXT NOT NULL DEFAULT '',
  quality TEXT NOT NULL DEFAULT 'normal'
    CHECK (quality IN ('root', 'optimal', 'best', 'normal', 'poor', 'missed')),
  analysis_note TEXT,
  unlock_trigger TEXT NOT NULL DEFAULT 'always',

  -- Tree structure (self-referential)
  parent_node_id UUID REFERENCES framework_nodes(id) ON DELETE SET NULL,

  -- Canvas position
  pos_x NUMERIC NOT NULL DEFAULT 0,
  pos_y NUMERIC NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_framework_nodes_case ON framework_nodes(case_id);

-- ═══════════════════════════════════════════════════════════════════════
-- Row Level Security (RLS) Policies
-- ═══════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_nodes ENABLE ROW LEVEL SECURITY;

-- Users: can read own row, admins can read all
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = auth_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = auth_id);

CREATE POLICY "Allow insert for authenticated users" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = auth_id);

-- Cases: published readable by all authenticated, drafts only by author
CREATE POLICY "Published cases are readable by all" ON cases
  FOR SELECT USING (
    status = 'published'
    OR author_id IN (SELECT id FROM users WHERE auth_id = auth.uid()::text)
  );

CREATE POLICY "Authors can insert cases" ON cases
  FOR INSERT WITH CHECK (
    author_id IN (SELECT id FROM users WHERE auth_id = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "Authors can update own cases" ON cases
  FOR UPDATE USING (
    author_id IN (SELECT id FROM users WHERE auth_id = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "Authors can delete own cases" ON cases
  FOR DELETE USING (
    author_id IN (SELECT id FROM users WHERE auth_id = auth.uid()::text AND role = 'admin')
  );

-- Case Turns: readable if case is readable, writable by case author (admin)
CREATE POLICY "Case turns are readable with case" ON case_turns
  FOR SELECT USING (
    case_id IN (
      SELECT id FROM cases WHERE status = 'published'
      OR author_id IN (SELECT id FROM users WHERE auth_id = auth.uid()::text)
    )
  );

CREATE POLICY "Admins can insert case turns" ON case_turns
  FOR INSERT WITH CHECK (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()::text AND role = 'admin'
      )
    )
  );

CREATE POLICY "Admins can update case turns" ON case_turns
  FOR UPDATE USING (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()::text AND role = 'admin'
      )
    )
  );

CREATE POLICY "Admins can delete case turns" ON case_turns
  FOR DELETE USING (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()::text AND role = 'admin'
      )
    )
  );

-- Framework Nodes: same pattern as case turns
CREATE POLICY "Framework nodes are readable with case" ON framework_nodes
  FOR SELECT USING (
    case_id IN (
      SELECT id FROM cases WHERE status = 'published'
      OR author_id IN (SELECT id FROM users WHERE auth_id = auth.uid()::text)
    )
  );

CREATE POLICY "Admins can insert framework nodes" ON framework_nodes
  FOR INSERT WITH CHECK (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()::text AND role = 'admin'
      )
    )
  );

CREATE POLICY "Admins can update framework nodes" ON framework_nodes
  FOR UPDATE USING (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()::text AND role = 'admin'
      )
    )
  );

CREATE POLICY "Admins can delete framework nodes" ON framework_nodes
  FOR DELETE USING (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()::text AND role = 'admin'
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Updated_at trigger function
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER case_turns_updated_at BEFORE UPDATE ON case_turns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER framework_nodes_updated_at BEFORE UPDATE ON framework_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- 5. USAGE LOGS (Activity Tracking)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_action ON usage_logs(action_type);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own logs" ON usage_logs
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()::text)
  );

CREATE POLICY "Admins can read all logs" ON usage_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid()::text AND role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 6. PRE-AUTHORIZED USERS (Access Control)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS preauthorized_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_preauthorized_users_email ON preauthorized_users(email);

-- Enable RLS
ALTER TABLE preauthorized_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow users to read their own preauthorization" ON preauthorized_users
  FOR SELECT USING (
    email = auth.jwt() ->> 'email'
    OR EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "Admins can manage preauthorized_users" ON preauthorized_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid()::text AND role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Developer Bypass Seed User
-- This row satisfies the FK constraint on cases.author_id when using
-- the offline dev bypass (ID matches the mock UUID in auth.tsx).
-- Safe to keep in production — it is never reachable via real auth.
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO users (id, auth_id, name, email, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Dev Admin',
  'dev-admin@casejourney.com',
  'admin'
)
ON CONFLICT (id) DO NOTHING;



