-- Add indexes for frequently queried columns on users table
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_trust_score ON public.users(trust_score);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_frozen ON public.users(frozen) WHERE frozen = true;

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_users_phone_trust ON public.users(phone_number, trust_score);

-- Add check constraints for data integrity
ALTER TABLE public.users
  ADD CONSTRAINT check_trust_score_range 
  CHECK (trust_score >= 0 AND trust_score <= 100);

ALTER TABLE public.users
  ADD CONSTRAINT check_wallet_balance_non_negative 
  CHECK (wallet_balance >= 0);

ALTER TABLE public.users
  ADD CONSTRAINT check_escrow_balance_non_negative 
  CHECK (escrow_balance >= 0);

-- Add unique constraint on phone_number if not exists
ALTER TABLE public.users
  ADD CONSTRAINT unique_phone_number UNIQUE (phone_number);

-- Add index on language for filtering
CREATE INDEX IF NOT EXISTS idx_users_language ON public.users(language);

-- Comment on important columns
COMMENT ON COLUMN public.users.trust_score IS 'User trust score (0-100)';
COMMENT ON COLUMN public.users.phone_number IS 'Unique phone number for user identification';
COMMENT ON COLUMN public.users.frozen IS 'Account status - true if account is frozen';