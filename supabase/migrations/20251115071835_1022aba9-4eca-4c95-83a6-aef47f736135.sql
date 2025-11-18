-- Fix core application schemas - Part 1: Create base tables without foreign keys

-- ============================================
-- STEP 1: Create users table first (needed by other tables)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT DEFAULT '',
  wallet_balance NUMERIC DEFAULT 0,
  escrow_balance NUMERIC DEFAULT 0,
  trust_score INTEGER DEFAULT 50,
  points INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  premium_tier TEXT,
  premium_expires_at TIMESTAMPTZ,
  frozen BOOLEAN DEFAULT false,
  total_messages_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- STEP 2: Create profiles table
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- STEP 3: Create rosca_groups table
-- ============================================

-- First, migrate data from groups to a temp table if groups exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups' AND table_schema = 'public') THEN
    CREATE TEMP TABLE temp_groups AS SELECT * FROM groups;
  END IF;
END $$;

-- Drop old groups table and views that reference it
DROP VIEW IF EXISTS group_dashboard CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- Create rosca_groups
CREATE TABLE IF NOT EXISTS rosca_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  contribution_amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  max_members INTEGER NOT NULL,
  current_members INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_code TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migrate data from temp table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'temp_groups') THEN
    INSERT INTO rosca_groups (id, name, contribution_amount, frequency, max_members, 
                              created_by, group_code, start_date, created_at, updated_at,
                              description, current_members, status)
    SELECT id, name, amount, frequency, max_members, admin_id, code, 
           COALESCE(created_at::date, CURRENT_DATE), 
           COALESCE(created_at, now()), COALESCE(updated_at, now()),
           rules, 1, 'active'
    FROM temp_groups
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- STEP 4: Update existing tables to reference rosca_groups
-- ============================================

-- Update group_members
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_group_id_fkey;
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_group_id_rosca_fkey;
ALTER TABLE group_members ADD CONSTRAINT group_members_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES rosca_groups(id) ON DELETE CASCADE;

-- Add position_in_cycle if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'group_members' AND column_name = 'position_in_cycle') THEN
    ALTER TABLE group_members ADD COLUMN position_in_cycle INTEGER;
  END IF;
END $$;

-- Update messages
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_group_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_group_id_rosca_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES rosca_groups(id) ON DELETE CASCADE;

-- Update contributions
ALTER TABLE contributions DROP CONSTRAINT IF EXISTS contributions_group_id_fkey;
ALTER TABLE contributions DROP CONSTRAINT IF EXISTS contributions_group_id_rosca_fkey;
ALTER TABLE contributions ADD CONSTRAINT contributions_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES rosca_groups(id) ON DELETE CASCADE;

-- Update payouts
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_group_id_fkey;
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_group_id_rosca_fkey;
ALTER TABLE payouts ADD CONSTRAINT payouts_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES rosca_groups(id) ON DELETE CASCADE;

-- Update payout_schedule
ALTER TABLE payout_schedule DROP CONSTRAINT IF EXISTS payout_schedule_group_id_fkey;
ALTER TABLE payout_schedule ADD CONSTRAINT payout_schedule_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES rosca_groups(id) ON DELETE CASCADE;

-- Update group_escrows
ALTER TABLE group_escrows DROP CONSTRAINT IF EXISTS group_escrows_group_id_fkey;
ALTER TABLE group_escrows ADD CONSTRAINT group_escrows_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES rosca_groups(id) ON DELETE CASCADE;

-- Update mobile_money_transactions
ALTER TABLE mobile_money_transactions DROP CONSTRAINT IF EXISTS mobile_money_transactions_group_id_fkey;
ALTER TABLE mobile_money_transactions ADD CONSTRAINT mobile_money_transactions_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES rosca_groups(id) ON DELETE SET NULL;

-- Update analytics_events
ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS analytics_events_group_id_fkey;
ALTER TABLE analytics_events ADD CONSTRAINT analytics_events_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES rosca_groups(id) ON DELETE SET NULL;

-- ============================================
-- STEP 5: Create remaining core tables
-- ============================================

-- User notifications
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Typing indicators
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES rosca_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Message read receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Trust scores
CREATE TABLE IF NOT EXISTS trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  score INTEGER DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  contributions_on_time INTEGER DEFAULT 0,
  missed_contributions INTEGER DEFAULT 0,
  total_contributions INTEGER DEFAULT 0,
  last_update TIMESTAMPTZ DEFAULT now()
);

-- Trust score history
CREATE TABLE IF NOT EXISTS trust_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  previous_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('contribution', 'payout', 'credit', 'debit', 'withdrawal', 'transfer')),
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  group_id UUID REFERENCES rosca_groups(id) ON DELETE SET NULL,
  phone TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- STEP 6: Add indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_rosca_groups_created_by ON rosca_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_rosca_groups_status ON rosca_groups(status);
CREATE INDEX IF NOT EXISTS idx_rosca_groups_group_code ON rosca_groups(group_code);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_group_id ON typing_indicators(group_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_trust_scores_user_id ON trust_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_score_history_user_id ON trust_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_group_id ON transactions(group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);