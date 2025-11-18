-- =====================================================
-- COMPREHENSIVE GROUP MANAGEMENT AUTOMATION FIX
-- =====================================================

-- 1. CREATE TRIGGER TO AUTO-UPDATE TRUST SCORE QUEUE ON CONTRIBUTIONS
CREATE OR REPLACE FUNCTION queue_trust_score_update_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue user for trust score recalculation
  INSERT INTO trust_score_update_queue (user_id, reason)
  VALUES (NEW.user_id, 'contribution_activity')
  ON CONFLICT (user_id) DO UPDATE SET
    queued_at = NOW(),
    reason = EXCLUDED.reason;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contribution_trust_score_update
AFTER INSERT OR UPDATE ON contributions
FOR EACH ROW
WHEN (NEW.status = 'completed' OR NEW.status = 'missed')
EXECUTE FUNCTION queue_trust_score_update_on_contribution();

-- 2. CREATE TRIGGER TO AUTO-UPDATE TRUST SCORE QUEUE ON MESSAGES
CREATE OR REPLACE FUNCTION queue_trust_score_update_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue for user messages, not system messages
  IF NEW.sender_id IS NOT NULL AND NEW.message_type = 'user' THEN
    INSERT INTO trust_score_update_queue (user_id, reason)
    VALUES (NEW.sender_id, 'message_activity')
    ON CONFLICT (user_id) DO UPDATE SET
      queued_at = NOW(),
      reason = EXCLUDED.reason;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_message_trust_score_update
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION queue_trust_score_update_on_message();

-- 3. CREATE TRIGGER TO AUTO-UPDATE PAYOUT POSITIONS WHEN TRUST SCORES CHANGE
CREATE OR REPLACE FUNCTION auto_update_payout_positions()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if trust score actually changed
  IF NEW.trust_score IS DISTINCT FROM OLD.trust_score THEN
    -- Get all groups this user is a member of
    PERFORM net.http_post(
      url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/update-payout-positions',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI3NjAzMCwiZXhwIjoyMDc1ODUyMDMwfQ.iQs8vYqH_wqmqP3fHKVNYLFbYvp0dPKc-pY1-7SG-1k"}'::jsonb,
      body:=json_build_object('userId', NEW.id)::text::jsonb
    ) FROM group_members WHERE user_id = NEW.id LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_update_payout_positions
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION auto_update_payout_positions();

-- 4. CREATE TRIGGER TO AUTO-CHECK ACHIEVEMENTS ON GROUP JOIN
CREATE OR REPLACE FUNCTION check_achievements_on_group_join()
RETURNS TRIGGER AS $$
BEGIN
  -- Invoke achievement check for the user
  PERFORM net.http_post(
    url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/check-achievements',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI3NjAzMCwiZXhwIjoyMDc1ODUyMDMwfQ.iQs8vYqH_wqmqP3fHKVNYLFbYvp0dPKc-pY1-7SG-1k"}'::jsonb,
    body:=json_build_object('userId', NEW.user_id)::text::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_achievements_on_join
AFTER INSERT ON group_members
FOR EACH ROW
EXECUTE FUNCTION check_achievements_on_group_join();

-- 5. CREATE TRIGGER TO SEND NOTIFICATIONS WHEN GROUP BECOMES ACTIVE
CREATE OR REPLACE FUNCTION notify_group_active()
RETURNS TRIGGER AS $$
BEGIN
  -- When group status changes to active, notify all members
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    -- Send notification via edge function
    PERFORM net.http_post(
      url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/send-push-notification',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI3NjAzMCwiZXhwIjoyMDc1ODUyMDMwfQ.iQs8vYqH_wqmqP3fHKVNYLFbYvp0dPKc-pY1-7SG-1k"}'::jsonb,
      body:=json_build_object(
        'groupId', NEW.id,
        'title', 'Group is Now Active! 🎉',
        'body', NEW.name || ' is now full and active. Contributions will begin soon!',
        'data', json_build_object('type', 'group_active', 'groupId', NEW.id)
      )::text::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_group_active
AFTER UPDATE ON rosca_groups
FOR EACH ROW
EXECUTE FUNCTION notify_group_active();

-- 6. ENSURE ALL CRON JOBS ARE SCHEDULED
-- Calculate trust scores daily at 01:00 CAT
SELECT cron.schedule(
  'calculate-trust-scores',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/calculate-trust-scores',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI3NjAzMCwiZXhwIjoyMDc1ODUyMDMwfQ.iQs8vYqH_wqmqP3fHKVNYLFbYvp0dPKc-pY1-7SG-1k"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Calculate bonuses daily at 02:00 CAT
SELECT cron.schedule(
  'calculate-bonuses',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/calculate-bonuses',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI3NjAzMCwiZXhwIjoyMDc1ODUyMDMwfQ.iQs8vYqH_wqmqP3fHKVNYLFbYvp0dPKc-pY1-7SG-1k"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Trigger scheduled payouts daily at 17:00 CAT
SELECT cron.schedule(
  'trigger-scheduled-payouts',
  '0 17 * * *',
  $$
  SELECT net.http_post(
    url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/trigger-scheduled-payouts',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI3NjAzMCwiZXhwIjoyMDc1ODUyMDMwfQ.iQs8vYqH_wqmqP3fHKVNYLFbYvp0dPKc-pY1-7SG-1k"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Send contribution reminders every 6 hours
SELECT cron.schedule(
  'send-contribution-reminders',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/send-contribution-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI3NjAzMCwiZXhwIjoyMDc1ODUyMDMwfQ.iQs8vYqH_wqmqP3fHKVNYLFbYvp0dPKc-pY1-7SG-1k"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Detect missed contributions daily at 08:00 CAT
SELECT cron.schedule(
  'detect-missed-contributions',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/detect-missed-contributions',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI3NjAzMCwiZXhwIjoyMDc1ODUyMDMwfQ.iQs8vYqH_wqmqP3fHKVNYLFbYvp0dPKc-pY1-7SG-1k"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Add helpful comments
COMMENT ON TRIGGER trigger_contribution_trust_score_update ON contributions IS 
  'Automatically queues users for trust score recalculation when they complete or miss a contribution';

COMMENT ON TRIGGER trigger_message_trust_score_update ON messages IS 
  'Automatically queues users for trust score recalculation when they send messages';

COMMENT ON TRIGGER trigger_auto_update_payout_positions ON users IS 
  'Automatically updates payout positions in all user groups when their trust score changes';

COMMENT ON TRIGGER trigger_check_achievements_on_join ON group_members IS 
  'Automatically checks and awards achievements when a user joins a group';

COMMENT ON TRIGGER trigger_notify_group_active ON rosca_groups IS 
  'Automatically notifies all group members when a group becomes active (full)';
