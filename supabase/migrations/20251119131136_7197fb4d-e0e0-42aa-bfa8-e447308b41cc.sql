-- Create function to send contribution notification to group
CREATE OR REPLACE FUNCTION notify_group_contribution()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_group_name TEXT;
BEGIN
  -- Only notify on completed contributions
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get user name
    SELECT full_name INTO v_user_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Get group name
    SELECT name INTO v_group_name
    FROM rosca_groups
    WHERE id = NEW.group_id;
    
    -- Send system message to group
    PERFORM net.http_post(
      url := 'https://fisljlameaewzwndwpsq.supabase.co/functions/v1/send-system-message',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzYwMzAsImV4cCI6MjA3NTg1MjAzMH0.mN0tkoMpmWYCug4tD6Zo19Wfy5eSAafgXmvWZFOUvXM"}'::jsonb,
      body := jsonb_build_object(
        'groupId', NEW.group_id,
        'template', 'contribution_completed',
        'data', jsonb_build_object(
          'userName', COALESCE(v_user_name, 'A member'),
          'amount', NEW.amount,
          'groupName', v_group_name
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for contribution notifications
DROP TRIGGER IF EXISTS trigger_notify_group_contribution ON contributions;
CREATE TRIGGER trigger_notify_group_contribution
  AFTER INSERT OR UPDATE ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_contribution();

-- Create function to send payout notification to group
CREATE OR REPLACE FUNCTION notify_group_payout()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_group_name TEXT;
BEGIN
  -- Only notify on completed payouts
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get user name
    SELECT full_name INTO v_user_name
    FROM profiles
    WHERE id = NEW.recipient_id;
    
    -- Get group name
    SELECT name INTO v_group_name
    FROM rosca_groups
    WHERE id = NEW.group_id;
    
    -- Send system message to group
    PERFORM net.http_post(
      url := 'https://fisljlameaewzwndwpsq.supabase.co/functions/v1/send-system-message',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzYwMzAsImV4cCI6MjA3NTg1MjAzMH0.mN0tkoMpmWYCug4tD6Zo19Wfy5eSAafgXmvWZFOUvXM"}'::jsonb,
      body := jsonb_build_object(
        'groupId', NEW.group_id,
        'template', 'payout_completed',
        'data', jsonb_build_object(
          'userName', COALESCE(v_user_name, 'A member'),
          'amount', NEW.amount,
          'groupName', v_group_name
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payout notifications
DROP TRIGGER IF EXISTS trigger_notify_group_payout ON payouts;
CREATE TRIGGER trigger_notify_group_payout
  AFTER INSERT OR UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_payout();

-- Create function to send bonus notification to group
CREATE OR REPLACE FUNCTION notify_group_bonus()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_group_name TEXT;
  v_bonus_name TEXT;
BEGIN
  -- Only notify on new bonuses with a group_id
  IF NEW.group_id IS NOT NULL AND (OLD.id IS NULL) THEN
    -- Get user name
    SELECT full_name INTO v_user_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Get group name
    SELECT name INTO v_group_name
    FROM rosca_groups
    WHERE id = NEW.group_id;
    
    -- Get bonus type name
    SELECT name INTO v_bonus_name
    FROM bonus_types
    WHERE code = NEW.bonus_type_code;
    
    -- Send system message to group
    PERFORM net.http_post(
      url := 'https://fisljlameaewzwndwpsq.supabase.co/functions/v1/send-system-message',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzYwMzAsImV4cCI6MjA3NTg1MjAzMH0.mN0tkoMpmWYCug4tD6Zo19Wfy5eSAafgXmvWZFOUvXM"}'::jsonb,
      body := jsonb_build_object(
        'groupId', NEW.group_id,
        'template', 'bonus_awarded',
        'data', jsonb_build_object(
          'userName', COALESCE(v_user_name, 'A member'),
          'amount', NEW.amount,
          'bonusName', COALESCE(v_bonus_name, 'Bonus'),
          'groupName', v_group_name
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for bonus notifications
DROP TRIGGER IF EXISTS trigger_notify_group_bonus ON bonus_transactions;
CREATE TRIGGER trigger_notify_group_bonus
  AFTER INSERT ON bonus_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_bonus();

-- Create function to send achievement notification to group
CREATE OR REPLACE FUNCTION notify_group_achievement()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_user_groups UUID[];
  v_group_id UUID;
BEGIN
  -- Only notify on new achievements
  IF OLD.id IS NULL THEN
    -- Get user name
    SELECT full_name INTO v_user_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Get all groups the user is a member of
    SELECT ARRAY_AGG(group_id) INTO v_user_groups
    FROM group_members
    WHERE user_id = NEW.user_id;
    
    -- Send notification to each group
    IF v_user_groups IS NOT NULL THEN
      FOREACH v_group_id IN ARRAY v_user_groups
      LOOP
        PERFORM net.http_post(
          url := 'https://fisljlameaewzwndwpsq.supabase.co/functions/v1/send-system-message',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzYwMzAsImV4cCI6MjA3NTg1MjAzMH0.mN0tkoMpmWYCug4tD6Zo19Wfy5eSAafgXmvWZFOUvXM"}'::jsonb,
          body := jsonb_build_object(
            'groupId', v_group_id,
            'template', 'achievement_earned',
            'data', jsonb_build_object(
              'userName', COALESCE(v_user_name, 'A member'),
              'achievementTitle', NEW.title,
              'achievementDescription', NEW.description
            )
          )
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for achievement notifications
DROP TRIGGER IF EXISTS trigger_notify_group_achievement ON achievements;
CREATE TRIGGER trigger_notify_group_achievement
  AFTER INSERT ON achievements
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_achievement();