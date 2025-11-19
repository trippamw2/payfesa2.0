-- Schedule smart alerts to run every 6 hours
SELECT cron.schedule(
  'send-smart-alerts',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/send-smart-alerts',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzYwMzAsImV4cCI6MjA3NTg1MjAzMH0.mN0tkoMpmWYCug4tD6Zo19Wfy5eSAafgXmvWZFOUvXM"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Add comment
COMMENT ON EXTENSION pg_cron IS 'Smart AI-powered alerts scheduled every 6 hours for reminders, education, promotions, and updates';

-- Create notification_types enum if not exists
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('reminder', 'education', 'promotion', 'update', 'system', 'payment', 'group', 'achievement', 'contribution_success', 'payout_approved', 'instant_payout_success', 'payout_rejected', 'member_join', 'group_message');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add index for faster queries on user_notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_type 
ON user_notifications(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_metadata 
ON user_notifications USING gin(metadata);
