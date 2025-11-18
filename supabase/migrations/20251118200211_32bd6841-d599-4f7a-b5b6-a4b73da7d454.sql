-- Ensure users table has proper defaults
ALTER TABLE public.users 
  ALTER COLUMN wallet_balance SET DEFAULT 0,
  ALTER COLUMN escrow_balance SET DEFAULT 0,
  ALTER COLUMN trust_score SET DEFAULT 50,
  ALTER COLUMN points SET DEFAULT 0,
  ALTER COLUMN total_messages_sent SET DEFAULT 0,
  ALTER COLUMN frozen SET DEFAULT false,
  ALTER COLUMN language SET DEFAULT 'en';

-- Create function to seed initial user data
CREATE OR REPLACE FUNCTION seed_new_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Initialize credit score (already handled by initialize_user_credit_score trigger)
  
  -- 2. Award welcome achievement
  INSERT INTO public.achievements (
    user_id,
    type,
    title,
    description,
    points_awarded,
    icon,
    tier,
    category
  ) VALUES (
    NEW.id,
    'welcome',
    'Welcome to PayFesa! 🎉',
    'Your journey begins! Complete your first contribution to earn more rewards.',
    10,
    '👋',
    'bronze',
    'onboarding'
  );
  
  -- 3. Give welcome bonus to wallet
  UPDATE public.users
  SET wallet_balance = wallet_balance + 50,
      points = points + 10
  WHERE id = NEW.id;
  
  -- 4. Create initial transaction record for welcome bonus
  INSERT INTO public.transactions (
    user_id,
    type,
    amount,
    status,
    metadata,
    net_amount
  ) VALUES (
    NEW.id,
    'credit',
    50,
    'completed',
    jsonb_build_object(
      'source', 'welcome_bonus',
      'description', 'Welcome bonus for new user'
    ),
    50
  );
  
  -- 5. Log analytics event
  INSERT INTO public.analytics_events (
    user_id,
    event_type,
    event_data
  ) VALUES (
    NEW.id,
    'user_signup',
    jsonb_build_object(
      'timestamp', NOW(),
      'language', NEW.language
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create trigger to seed data for new users
DROP TRIGGER IF EXISTS trigger_seed_new_user_data ON public.users;
CREATE TRIGGER trigger_seed_new_user_data
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION seed_new_user_data();

-- Backfill initial data for existing users who might be missing it
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Award welcome achievement to users who don't have any achievements
  FOR user_record IN 
    SELECT u.id, u.language
    FROM public.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.achievements a 
      WHERE a.user_id = u.id AND a.type = 'welcome'
    )
  LOOP
    -- Award welcome achievement
    INSERT INTO public.achievements (
      user_id,
      type,
      title,
      description,
      points_awarded,
      icon,
      tier,
      category
    ) VALUES (
      user_record.id,
      'welcome',
      'Welcome to PayFesa! 🎉',
      'Your journey begins! Complete your first contribution to earn more rewards.',
      10,
      '👋',
      'bronze',
      'onboarding'
    )
    ON CONFLICT DO NOTHING;
    
    -- Update points if not already updated
    UPDATE public.users
    SET points = COALESCE(points, 0) + 10
    WHERE id = user_record.id AND (points IS NULL OR points = 0);
  END LOOP;
END $$;