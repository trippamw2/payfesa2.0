-- Enhanced database structure for PayChangu integration
-- Add missing fields and tables for complete payment flow

-- Update contributions table with required fields
ALTER TABLE public.contributions 
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update payouts table with required fields  
ALTER TABLE public.payouts
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_id UUID,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add foreign key for payout account_id
ALTER TABLE public.payouts
ADD CONSTRAINT payouts_account_mobile_fkey 
FOREIGN KEY (account_id) 
REFERENCES public.mobile_money_accounts(id) 
ON DELETE SET NULL
NOT VALID;

ALTER TABLE public.payouts VALIDATE CONSTRAINT payouts_account_mobile_fkey;

-- Create group_balance table for tracking group finances
CREATE TABLE IF NOT EXISTS public.group_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.rosca_groups(id) ON DELETE CASCADE,
  total_contributions NUMERIC NOT NULL DEFAULT 0,
  total_payouts NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  escrow_balance NUMERIC NOT NULL DEFAULT 0,
  reserve_balance NUMERIC NOT NULL DEFAULT 0,
  total_fees_paid NUMERIC NOT NULL DEFAULT 0,
  last_contribution_at TIMESTAMPTZ,
  last_payout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id)
);

-- Enable RLS on group_balance
ALTER TABLE public.group_balance ENABLE ROW LEVEL SECURITY;

-- Group members can view their group balance
CREATE POLICY "Group members can view group balance"
ON public.group_balance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_balance.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- System can manage group balance
CREATE POLICY "System can manage group balance"
ON public.group_balance FOR ALL
USING (true)
WITH CHECK (true);

-- Create user_balance_history table for audit trail
CREATE TABLE IF NOT EXISTS public.user_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  balance_type VARCHAR(50) NOT NULL CHECK (balance_type IN ('wallet', 'escrow')),
  previous_balance NUMERIC NOT NULL,
  new_balance NUMERIC NOT NULL,
  change_amount NUMERIC NOT NULL,
  transaction_id UUID,
  transaction_type VARCHAR(50),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_balance_history
ALTER TABLE public.user_balance_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own balance history
CREATE POLICY "Users can view their own balance history"
ON public.user_balance_history FOR SELECT
USING (auth.uid() = user_id);

-- System can insert balance history
CREATE POLICY "System can insert balance history"
ON public.user_balance_history FOR INSERT
WITH CHECK (true);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contributions_payment_reference ON public.contributions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON public.contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_payment_method ON public.contributions(payment_method);

CREATE INDEX IF NOT EXISTS idx_payouts_payment_reference ON public.payouts(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payouts_payment_method ON public.payouts(payment_method);
CREATE INDEX IF NOT EXISTS idx_payouts_account_id ON public.payouts(account_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_external_reference ON public.payment_transactions(external_reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON public.payment_transactions(type);

CREATE INDEX IF NOT EXISTS idx_group_balance_group_id ON public.group_balance(group_id);
CREATE INDEX IF NOT EXISTS idx_user_balance_history_user_id ON public.user_balance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_balance_history_transaction_id ON public.user_balance_history(transaction_id);

-- Add trigger to update group_balance updated_at
CREATE OR REPLACE FUNCTION update_group_balance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_balance_updated_at
BEFORE UPDATE ON public.group_balance
FOR EACH ROW
EXECUTE FUNCTION update_group_balance_timestamp();

-- Add trigger to update contribution updated_at
CREATE TRIGGER update_contributions_updated_at
BEFORE UPDATE ON public.contributions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.group_balance IS 'Tracks financial status of each ROSCA group';
COMMENT ON TABLE public.user_balance_history IS 'Audit trail for all user balance changes';
COMMENT ON COLUMN public.contributions.payment_reference IS 'PayChangu transaction reference';
COMMENT ON COLUMN public.contributions.fee_amount IS 'Transaction fees charged by payment provider';
COMMENT ON COLUMN public.contributions.receipt_url IS 'URL to transaction receipt/proof';
COMMENT ON COLUMN public.payouts.payment_reference IS 'PayChangu payout reference';
COMMENT ON COLUMN public.payouts.account_id IS 'Mobile money or bank account used for payout';