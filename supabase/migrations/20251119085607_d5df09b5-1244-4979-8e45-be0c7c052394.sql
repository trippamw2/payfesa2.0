-- Function to send system message and notification
CREATE OR REPLACE FUNCTION send_group_notification(
  p_group_id UUID,
  p_message TEXT,
  p_notification_type TEXT DEFAULT 'group_activity',
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
DECLARE
  v_member RECORD;
  v_group_name TEXT;
BEGIN
  -- Get group name
  SELECT name INTO v_group_name FROM rosca_groups WHERE id = p_group_id;
  
  -- Insert system message in group chat
  INSERT INTO messages (group_id, message, message_type, metadata, sender_id)
  VALUES (p_group_id, p_message, 'system', p_metadata, NULL);
  
  -- Send notification to all group members
  FOR v_member IN 
    SELECT user_id FROM group_members WHERE group_id = p_group_id
  LOOP
    INSERT INTO user_notifications (user_id, type, title, message, metadata)
    VALUES (
      v_member.user_id,
      p_notification_type,
      v_group_name || ' - Activity',
      p_message,
      jsonb_build_object('group_id', p_group_id) || p_metadata
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for new contributions
CREATE OR REPLACE FUNCTION notify_contribution_made() RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_group_name TEXT;
  v_amount TEXT;
BEGIN
  IF NEW.status = 'completed' THEN
    -- Get user and group details
    SELECT name INTO v_user_name FROM users WHERE id = NEW.user_id;
    SELECT name INTO v_group_name FROM rosca_groups WHERE id = NEW.group_id;
    
    -- Format amount
    v_amount := NEW.amount || ' MWK';
    
    -- Send group notification
    PERFORM send_group_notification(
      NEW.group_id,
      '🎉 ' || v_user_name || ' contributed ' || v_amount || '! Great job!',
      'contribution_success',
      jsonb_build_object('user_id', NEW.user_id, 'amount', NEW.amount, 'contribution_id', NEW.id)
    );
    
    -- Send personal notification to contributor
    INSERT INTO user_notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      'contribution_success',
      'Contribution Successful',
      'Your contribution of ' || v_amount || ' to ' || v_group_name || ' has been received!',
      jsonb_build_object('group_id', NEW.group_id, 'amount', NEW.amount)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for contributions
DROP TRIGGER IF EXISTS on_contribution_completed ON contributions;
CREATE TRIGGER on_contribution_completed
  AFTER INSERT OR UPDATE ON contributions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION notify_contribution_made();

-- Trigger function for new group members
CREATE OR REPLACE FUNCTION notify_member_joined() RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_group_name TEXT;
BEGIN
  SELECT name INTO v_user_name FROM users WHERE id = NEW.user_id;
  SELECT name INTO v_group_name FROM rosca_groups WHERE id = NEW.group_id;
  
  -- Send group notification
  PERFORM send_group_notification(
    NEW.group_id,
    '👋 Welcome ' || v_user_name || ' to the group! Let''s achieve our goals together!',
    'member_join',
    jsonb_build_object('user_id', NEW.user_id)
  );
  
  -- Send personal welcome notification
  INSERT INTO user_notifications (user_id, type, title, message, metadata)
  VALUES (
    NEW.user_id,
    'member_join',
    'Welcome to ' || v_group_name,
    'You have successfully joined the group! Start contributing to reach your goals.',
    jsonb_build_object('group_id', NEW.group_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new members
DROP TRIGGER IF EXISTS on_member_joined ON group_members;
CREATE TRIGGER on_member_joined
  AFTER INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_member_joined();

-- Trigger function for payouts
CREATE OR REPLACE FUNCTION notify_payout() RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_group_name TEXT;
  v_amount TEXT;
BEGIN
  IF NEW.status = 'completed' THEN
    SELECT name INTO v_user_name FROM users WHERE id = NEW.user_id;
    SELECT name INTO v_group_name FROM rosca_groups WHERE id = NEW.group_id;
    v_amount := NEW.amount || ' MWK';
    
    -- Send group notification
    PERFORM send_group_notification(
      NEW.group_id,
      '✅ ' || v_user_name || ' received their payout of ' || v_amount || '! Congratulations! 🎊',
      'payout_approved',
      jsonb_build_object('user_id', NEW.user_id, 'amount', NEW.amount)
    );
    
    -- Send personal notification
    INSERT INTO user_notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      'instant_payout_success',
      'Payout Received',
      'You have received your payout of ' || v_amount || ' from ' || v_group_name || '!',
      jsonb_build_object('group_id', NEW.group_id, 'amount', NEW.amount)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for payouts
DROP TRIGGER IF EXISTS on_payout_completed ON payment_transactions;
CREATE TRIGGER on_payout_completed
  AFTER INSERT OR UPDATE ON payment_transactions
  FOR EACH ROW
  WHEN (NEW.type = 'payout' AND NEW.status = 'completed')
  EXECUTE FUNCTION notify_payout();

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON user_notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_group_created ON messages(group_id, created_at DESC);