-- Create function to initialize credit score for a user
CREATE OR REPLACE FUNCTION initialize_user_credit_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert credit score record for new user
  INSERT INTO public.credit_scores (
    user_id,
    base_score,
    trust_score,
    total_groups_joined,
    total_cycles_completed,
    late_payments,
    flagged_fraud,
    last_update
  ) VALUES (
    NEW.id,
    500,  -- Default base score
    50,   -- Default trust score
    0,    -- No groups joined yet
    0,    -- No cycles completed yet
    0,    -- No late payments
    false, -- Not flagged for fraud
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-initialize credit scores for new users
DROP TRIGGER IF EXISTS trigger_initialize_credit_score ON public.users;
CREATE TRIGGER trigger_initialize_credit_score
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_credit_score();

-- Backfill credit scores for existing users who don't have one
INSERT INTO public.credit_scores (
  user_id,
  base_score,
  trust_score,
  total_groups_joined,
  total_cycles_completed,
  late_payments,
  flagged_fraud,
  last_update
)
SELECT 
  u.id,
  500,  -- Default base score
  50,   -- Default trust score
  COALESCE(
    (SELECT COUNT(DISTINCT group_id) 
     FROM public.group_members 
     WHERE user_id = u.id), 
    0
  ) as total_groups_joined,
  0,    -- Cycles completed (can be calculated later)
  0,    -- Late payments (can be calculated later)
  false, -- Not flagged
  NOW()
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.credit_scores cs 
  WHERE cs.user_id = u.id
);