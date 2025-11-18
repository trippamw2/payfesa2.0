-- Add wallet reconciliation cron job (daily at 02:00 CAT)
SELECT cron.schedule(
  'reconcile-wallet-balances',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/reconcile-wallet-balances',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI3NjAzMCwiZXhwIjoyMDc1ODUyMDMwfQ.iQs8vYqH_wqmqP3fHKVNYLFbYvp0dPKc-pY1-7SG-1k"}'::jsonb,
    body:=json_build_object('trigger', 'cron')::text::jsonb
  ) as request_id;
  $$
);
