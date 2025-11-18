-- Elite Trust Score System Schema Updates
-- Add tracking columns for elite requirements

-- Add columns to users table for elite tracking
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS contribution_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS fast_contributions integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_referrals integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS chat_messages_this_cycle integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_cycles integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS elite_status boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS elite_since timestamp with time zone DEFAULT NULL;

-- Add columns to trust_scores table
ALTER TABLE public.trust_scores
ADD COLUMN IF NOT EXISTS contribution_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS fast_contributions integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_contributions integer DEFAULT 0;

-- Create table for tracking user referrals
CREATE TABLE IF NOT EXISTS public.user_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  referred_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  contribution_count integer DEFAULT 0,
  never_late boolean DEFAULT true,
  UNIQUE(referrer_id, referred_id)
);

-- Enable RLS on user_referrals
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
  ON public.user_referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "System can manage referrals"
  ON public.user_referrals FOR ALL
  USING (true);

-- Update bonus_types table to add expiry and constraints
ALTER TABLE public.bonus_types
ADD COLUMN IF NOT EXISTS min_trust_score integer DEFAULT 90,
ADD COLUMN IF NOT EXISTS expires_days integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_per_cycle integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS streak_multiplier jsonb DEFAULT '{"20": 500, "50": 1000, "100": 2000}'::jsonb;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_trust_score ON public.users(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_users_elite_status ON public.users(elite_status) WHERE elite_status = true;
CREATE INDEX IF NOT EXISTS idx_trust_scores_user_group ON public.trust_scores(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer ON public.user_referrals(referrer_id) WHERE is_active = true;

-- Update existing bonus types to require trust_score > 90
UPDATE public.bonus_types
SET min_trust_score = 90,
    conditions = jsonb_set(
      conditions,
      '{min_trust_score}',
      '90'::jsonb
    )
WHERE is_active = true;

-- Create elite bonus types if they don't exist
INSERT INTO public.bonus_types (code, name, bonus_amount, conditions, is_active, min_trust_score, expires_days)
VALUES 
  ('ELITE_STREAK_20', 'Elite 20-Streak Bonus', 500, '{"min_streak": 20, "min_trust_score": 90}'::jsonb, true, 90, 10),
  ('ELITE_STREAK_50', 'Elite 50-Streak Bonus', 1000, '{"min_streak": 50, "min_trust_score": 90}'::jsonb, true, 90, 10),
  ('ELITE_STREAK_100', 'Elite 100-Streak Bonus', 2000, '{"min_streak": 100, "min_trust_score": 90}'::jsonb, true, 90, 10),
  ('ELITE_PRIORITY', 'Elite Priority Bonus', 300, '{"min_trust_score": 90}'::jsonb, true, 90, 10)
ON CONFLICT (code) DO UPDATE SET
  min_trust_score = 90,
  expires_days = 10,
  is_active = true;