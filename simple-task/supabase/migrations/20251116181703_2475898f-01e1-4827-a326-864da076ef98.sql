-- Create bonus_types table for defining available bonuses
CREATE TABLE IF NOT EXISTS public.bonus_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  description TEXT,
  bonus_amount NUMERIC NOT NULL DEFAULT 0,
  bonus_percentage NUMERIC,
  conditions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create bonus_transactions table for tracking awarded bonuses
CREATE TABLE IF NOT EXISTS public.bonus_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.rosca_groups(id) ON DELETE SET NULL,
  bonus_type_code VARCHAR NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  awarded_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_bonus_transactions_user_id ON public.bonus_transactions(user_id);
CREATE INDEX idx_bonus_transactions_awarded_at ON public.bonus_transactions(awarded_at);
CREATE INDEX idx_bonus_transactions_processed ON public.bonus_transactions(processed);

-- Insert default bonus types
INSERT INTO public.bonus_types (code, name, description, bonus_amount, conditions) VALUES
('CONSISTENCY_3', 'Consistency Bonus', 'Awarded for 3 consecutive on-time payments', 500, '{"consecutive_payments": 3}'),
('EARLY_BIRD', 'Early Bird Bonus', 'Awarded for paying before deadline', 200, '{"days_early": 2}'),
('TRUST_90', 'High Trust Bonus', 'Awarded for maintaining trust score above 90', 1000, '{"min_trust_score": 90}'),
('PERFECT_SCORE', 'Perfect Score Bonus', 'Awarded for achieving perfect 100 trust score', 2000, '{"min_trust_score": 100}'),
('NO_MISS', 'Perfect Record Bonus', 'Awarded for completing 10+ cycles without missing a payment', 1500, '{"min_cycles": 10, "missed_payments": 0}');

-- Enable RLS
ALTER TABLE public.bonus_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bonus_types
CREATE POLICY "Anyone can view active bonus types"
  ON public.bonus_types
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage bonus types"
  ON public.bonus_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for bonus_transactions
CREATE POLICY "Users can view their own bonus transactions"
  ON public.bonus_transactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bonus transactions"
  ON public.bonus_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_bonus_types_updated_at
  BEFORE UPDATE ON public.bonus_types
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();