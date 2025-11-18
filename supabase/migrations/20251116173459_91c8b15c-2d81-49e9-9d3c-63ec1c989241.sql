-- Schedule missed contribution detection to run every hour at 30 minutes past the hour
SELECT cron.schedule(
  'detect-missed-contributions-hourly',
  '30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/detect-missed-contributions',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzYwMzAsImV4cCI6MjA3NTg1MjAzMH0.mN0tkoMpmWYCug4tD6Zo19Wfy5eSAafgXmvWZFOUvXM"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);