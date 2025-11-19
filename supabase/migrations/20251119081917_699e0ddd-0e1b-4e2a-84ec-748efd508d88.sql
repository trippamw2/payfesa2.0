-- Add onboarding fields to profiles table (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='onboarding_completed') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='onboarding_step') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_step INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='onboarding_completed_at') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='referral_code') THEN
    ALTER TABLE profiles ADD COLUMN referral_code TEXT UNIQUE;
  END IF;
END $$;

-- Generate referral codes for existing users
UPDATE profiles 
SET referral_code = upper(substring(md5(random()::text) from 1 for 8))
WHERE referral_code IS NULL;

-- Create referrals table only if it doesn't exist
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  reward_amount NUMERIC DEFAULT 0,
  reward_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referrer_id, referee_id)
);

-- Enable RLS on referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Drop and recreate referrals policies
DROP POLICY IF EXISTS "Users can view their own referrals" ON referrals;
CREATE POLICY "Users can view their own referrals"
ON referrals FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

DROP POLICY IF EXISTS "System can manage referrals" ON referrals;
CREATE POLICY "System can manage referrals"
ON referrals FOR ALL
USING (true);

-- Create indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Function to process referral signup
CREATE OR REPLACE FUNCTION process_referral_signup()
RETURNS TRIGGER AS $$
DECLARE
  referrer_code TEXT;
  referrer_user_id UUID;
BEGIN
  -- Get referral code from metadata
  referrer_code := NEW.raw_user_meta_data->>'referral_code';
  
  IF referrer_code IS NOT NULL THEN
    -- Find referrer by code
    SELECT id INTO referrer_user_id
    FROM profiles
    WHERE referral_code = referrer_code;
    
    IF referrer_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM user_notifications LIMIT 1) THEN
      -- Create referral record
      INSERT INTO referrals (referrer_id, referee_id, status)
      VALUES (referrer_user_id, NEW.id, 'pending');
      
      -- Send notification to referrer
      INSERT INTO user_notifications (user_id, title, message, type, data)
      VALUES (
        referrer_user_id,
        'New Referral!',
        'Someone joined using your referral link!',
        'system',
        jsonb_build_object('referee_id', NEW.id, 'route', '/invite')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for referral processing
DROP TRIGGER IF EXISTS on_auth_user_referral ON auth.users;
CREATE TRIGGER on_auth_user_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION process_referral_signup();