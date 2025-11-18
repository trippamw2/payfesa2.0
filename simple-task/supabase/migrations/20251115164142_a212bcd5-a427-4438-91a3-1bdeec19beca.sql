-- PHASE 1: Fix missing foreign key relationships

-- Add foreign key from payouts.group_id to rosca_groups.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payouts_group_id_fkey' 
    AND table_name = 'payouts'
  ) THEN
    ALTER TABLE public.payouts 
    ADD CONSTRAINT payouts_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES public.rosca_groups(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key from payout_schedule.group_id to rosca_groups.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payout_schedule_group_id_fkey' 
    AND table_name = 'payout_schedule'
  ) THEN
    ALTER TABLE public.payout_schedule 
    ADD CONSTRAINT payout_schedule_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES public.rosca_groups(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key from trust_scores.group_id to rosca_groups.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trust_scores_group_id_fkey' 
    AND table_name = 'trust_scores'
  ) THEN
    ALTER TABLE public.trust_scores 
    ADD CONSTRAINT trust_scores_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES public.rosca_groups(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key from group_members.group_id to rosca_groups.id (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'group_members_group_id_fkey' 
    AND table_name = 'group_members'
  ) THEN
    ALTER TABLE public.group_members 
    ADD CONSTRAINT group_members_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES public.rosca_groups(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payouts_group_id ON public.payouts(group_id);
CREATE INDEX IF NOT EXISTS idx_payout_schedule_group_id ON public.payout_schedule(group_id);
CREATE INDEX IF NOT EXISTS idx_trust_scores_group_id ON public.trust_scores(group_id);
CREATE INDEX IF NOT EXISTS idx_trust_scores_user_group ON public.trust_scores(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);