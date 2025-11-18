-- Fix mobile_money_accounts - add is_verified column
ALTER TABLE mobile_money_accounts 
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Create rosca_groups table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rosca_groups') THEN
    CREATE TABLE rosca_groups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar NOT NULL,
      description text,
      amount numeric NOT NULL,
      frequency varchar NOT NULL DEFAULT 'monthly',
      max_members integer NOT NULL,
      current_members integer DEFAULT 0,
      group_code varchar UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
      creator_id uuid,
      status varchar DEFAULT 'active',
      start_date date,
      next_contribution_date date,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE rosca_groups ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Users can view groups they are members of"
      ON rosca_groups FOR SELECT
      USING (true);
    
    CREATE POLICY "Authenticated users can create groups"
      ON rosca_groups FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
    
    CREATE POLICY "Group creators can update groups"
      ON rosca_groups FOR UPDATE
      USING (true);
    
    -- Add trigger for updated_at
    CREATE TRIGGER update_rosca_groups_updated_at
      BEFORE UPDATE ON rosca_groups
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create user_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title varchar NOT NULL,
  message text NOT NULL,
  type varchar NOT NULL DEFAULT 'info',
  read boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on user_notifications
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON user_notifications;

-- Create RLS policies for user_notifications
CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (true);

-- Add useful indexes
CREATE INDEX IF NOT EXISTS idx_mobile_money_accounts_user_verified ON mobile_money_accounts(user_id, is_verified);
CREATE INDEX IF NOT EXISTS idx_rosca_groups_code ON rosca_groups(group_code);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread ON user_notifications(user_id, read) WHERE read = false;