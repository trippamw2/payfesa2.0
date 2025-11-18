-- Fix critical database schema (final version)

-- Add missing columns to mobile_money_accounts
ALTER TABLE public.mobile_money_accounts
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_mobile_money_primary 
  ON public.mobile_money_accounts(user_id, is_primary) 
  WHERE is_primary = true;

-- Create rosca_groups view for backward compatibility
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rosca_groups') THEN
    CREATE OR REPLACE VIEW public.rosca_groups AS 
    SELECT 
      id,
      name,
      admin_id as created_by,
      amount as contribution_amount,
      frequency,
      max_members,
      (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = groups.id) as current_members,
      CASE 
        WHEN next_contribution_date > CURRENT_DATE THEN 'active'
        ELSE 'completed'
      END as status,
      created_at as start_date,
      created_at,
      updated_at,
      code,
      rules,
      cycle_ends_at,
      next_contribution_date
    FROM public.groups;
  END IF;
END $$;

-- Create payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  gross_amount numeric NOT NULL CHECK (gross_amount > 0),
  commission_amount numeric NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_date timestamp with time zone NOT NULL DEFAULT now(),
  cycle_number integer NOT NULL DEFAULT 1,
  mobile_money_reference text,
  failure_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payouts" ON public.payouts;
CREATE POLICY "Users can view their own payouts"
  ON public.payouts FOR SELECT
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all payouts" ON public.payouts;
CREATE POLICY "Admins can manage all payouts"
  ON public.payouts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_payouts_recipient ON public.payouts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payouts_group ON public.payouts(group_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_date ON public.payouts(payout_date);

-- Create contributions table
CREATE TABLE IF NOT EXISTS public.contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  transaction_id text,
  payment_method text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own contributions" ON public.contributions;
CREATE POLICY "Users can view their own contributions"
  ON public.contributions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own contributions" ON public.contributions;
CREATE POLICY "Users can create their own contributions"
  ON public.contributions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_contributions_user ON public.contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_group ON public.contributions(group_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON public.contributions(status);

-- Create user_notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.user_notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.user_notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.user_notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON public.user_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created ON public.user_notifications(created_at DESC);

-- Create transactions view
CREATE OR REPLACE VIEW public.user_transactions AS
SELECT 
  t.id,
  t.user_id,
  t.type,
  t.amount,
  t.status,
  t.created_at,
  t.group_id,
  g.name as group_name
FROM public.mobile_money_transactions t
LEFT JOIN public.groups g ON t.group_id = g.id
UNION ALL
SELECT 
  c.id,
  c.user_id,
  'contribution' as type,
  c.amount,
  c.status,
  c.created_at,
  c.group_id,
  g.name as group_name
FROM public.contributions c
LEFT JOIN public.groups g ON c.group_id = g.id
UNION ALL
SELECT 
  p.id,
  p.recipient_id as user_id,
  'payout' as type,
  p.amount,
  p.status,
  p.created_at,
  p.group_id,
  g.name as group_name
FROM public.payouts p
LEFT JOIN public.groups g ON p.group_id = g.id;

GRANT SELECT ON public.user_transactions TO authenticated;

-- Add triggers using existing trigger_set_updated_at function
DROP TRIGGER IF EXISTS set_updated_at_payouts ON public.payouts;
CREATE TRIGGER set_updated_at_payouts 
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_contributions ON public.contributions;
CREATE TRIGGER set_updated_at_contributions 
  BEFORE UPDATE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();