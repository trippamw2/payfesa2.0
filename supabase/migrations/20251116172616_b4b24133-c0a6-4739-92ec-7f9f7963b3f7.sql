-- Create reserve_wallet table
CREATE TABLE public.reserve_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reserve_transactions table
CREATE TABLE public.reserve_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('reserve_in', 'reserve_out', 'reserve_adjustment')),
  amount NUMERIC(10,2) NOT NULL,
  group_id UUID REFERENCES public.rosca_groups(id),
  user_id UUID REFERENCES public.users(id),
  reason TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reserve_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserve_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can view/manage reserve wallet
CREATE POLICY "Admins can view reserve wallet"
  ON public.reserve_wallet FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reserve wallet"
  ON public.reserve_wallet FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view reserve transactions"
  ON public.reserve_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert reserve transactions"
  ON public.reserve_transactions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create function to update reserve wallet
CREATE OR REPLACE FUNCTION public.add_to_reserve_wallet(p_amount NUMERIC, p_group_id UUID, p_user_id UUID, p_reason TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
  v_reserve_id UUID;
BEGIN
  -- Get or create reserve wallet
  SELECT id INTO v_reserve_id FROM public.reserve_wallet LIMIT 1;
  
  IF v_reserve_id IS NULL THEN
    INSERT INTO public.reserve_wallet (total_amount) VALUES (0) RETURNING id INTO v_reserve_id;
  END IF;
  
  -- Update reserve wallet balance
  UPDATE public.reserve_wallet
  SET total_amount = total_amount + p_amount,
      updated_at = now()
  WHERE id = v_reserve_id;
  
  -- Record transaction
  INSERT INTO public.reserve_transactions (type, amount, group_id, user_id, reason)
  VALUES ('reserve_in', p_amount, p_group_id, p_user_id, p_reason)
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Create trigger to update timestamp
CREATE TRIGGER update_reserve_wallet_timestamp
  BEFORE UPDATE ON public.reserve_wallet
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Add indexes for performance
CREATE INDEX idx_reserve_transactions_timestamp ON public.reserve_transactions(timestamp DESC);
CREATE INDEX idx_reserve_transactions_type ON public.reserve_transactions(type);
CREATE INDEX idx_reserve_transactions_user_id ON public.reserve_transactions(user_id);
CREATE INDEX idx_reserve_transactions_group_id ON public.reserve_transactions(group_id);