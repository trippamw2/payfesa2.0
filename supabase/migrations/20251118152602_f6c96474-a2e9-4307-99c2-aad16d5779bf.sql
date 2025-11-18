-- Add missing columns and improve database structure for unified app

-- Ensure users table has all required fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active';

-- Add payment gateway status tracking
CREATE TABLE IF NOT EXISTS public.payment_gateway_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'inactive',
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add payment transactions table for unified tracking
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.rosca_groups(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL, -- 'contribution', 'payout', 'deposit', 'withdrawal'
  method VARCHAR(50) NOT NULL, -- 'mobile_money', 'bank_transfer'
  provider VARCHAR(50), -- 'airtel', 'tnm', 'bank_name'
  amount NUMERIC NOT NULL,
  fee_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  reference VARCHAR(255),
  external_reference VARCHAR(255),
  account_id UUID, -- References mobile_money_accounts or bank_accounts
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT valid_amount CHECK (amount > 0),
  CONSTRAINT valid_net_amount CHECK (net_amount >= 0)
);

-- Enable RLS on new tables
ALTER TABLE public.payment_gateway_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_gateway_status
CREATE POLICY "Admins can view payment gateway status"
  ON public.payment_gateway_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can manage payment gateway status"
  ON public.payment_gateway_status FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view their own payment transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all payment transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can manage payment transactions"
  ON public.payment_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_group_id ON public.payment_transactions(group_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON public.payment_transactions(type);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON public.payment_transactions(created_at DESC);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_payment_transaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_transactions_timestamp
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_transaction_timestamp();

-- Ensure rosca_groups has all required fields
ALTER TABLE public.rosca_groups ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.rosca_groups ADD COLUMN IF NOT EXISTS auto_payout BOOLEAN DEFAULT true;
ALTER TABLE public.rosca_groups ADD COLUMN IF NOT EXISTS payout_method VARCHAR(50) DEFAULT 'scheduled';

-- Add group settings table for flexible configuration
CREATE TABLE IF NOT EXISTS public.group_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.rosca_groups(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, setting_key)
);

ALTER TABLE public.group_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view group settings"
  ON public.group_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_settings.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can manage group settings"
  ON public.group_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rosca_groups
      WHERE id = group_settings.group_id AND creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rosca_groups
      WHERE id = group_settings.group_id AND creator_id = auth.uid()
    )
  );

-- Add app_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public settings are viewable by all"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Admins can manage app settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default app settings
INSERT INTO public.app_settings (setting_key, setting_value, description, is_public)
VALUES 
  ('payment_fees', '{"platform_fee": 0.05, "reserve_fee": 0.01, "government_fee": 0.06, "instant_payout_fee": 1500}', 'Payment fee structure', true),
  ('contribution_reminder_days', '{"before": [3, 1], "after": [1, 3]}', 'Days to send reminders before/after due date', false),
  ('payout_schedule_time', '{"hour": 17, "minute": 0}', 'Default payout time (17:00 CAT)', false),
  ('max_group_members', '50', 'Maximum members allowed per group', true),
  ('min_contribution_amount', '1000', 'Minimum contribution amount in MWK', true)
ON CONFLICT (setting_key) DO NOTHING;