-- Add cron job to send daily engagement messages at 9 AM CAT
SELECT cron.schedule(
  'send-daily-engagement',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/send-daily-engagement',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzYwMzAsImV4cCI6MjA3NTg1MjAzMH0.mN0tkoMpmWYCug4tD6Zo19Wfy5eSAafgXmvWZFOUvXM"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) AS request_id;
  $$
);