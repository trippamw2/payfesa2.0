-- Add cron job to send contribution reminders every 6 hours
SELECT cron.schedule(
  'send-contribution-reminders',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/send-contribution-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzYwMzAsImV4cCI6MjA3NTg1MjAzMH0.mN0tkoMpmWYCug4tD6Zo19Wfy5eSAafgXmvWZFOUvXM"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Comment explaining the reminder system
COMMENT ON TABLE public.contributions IS 'Tracks user contributions to groups. Reminders sent automatically every 6 hours for pending contributions.';