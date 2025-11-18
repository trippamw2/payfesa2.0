-- Add cron job to calculate trust scores daily at 01:00 CAT
SELECT cron.schedule(
  'calculate-trust-scores-daily',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/calculate-trust-scores',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzYwMzAsImV4cCI6MjA3NTg1MjAzMH0.mN0tkoMpmWYCug4tD6Zo19Wfy5eSAafgXmvWZFOUvXM"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Add cron job to calculate bonuses daily at 02:00 CAT (after trust scores)
SELECT cron.schedule(
  'calculate-bonuses-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://fisljlameaewzwndwpsq.supabase.co/functions/v1/calculate-bonuses',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzYwMzAsImV4cCI6MjA3NTg1MjAzMH0.mN0tkoMpmWYCug4tD6Zo19Wfy5eSAafgXmvWZFOUvXM"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Create table to track users needing trust score recalculation (optimization)
CREATE TABLE IF NOT EXISTS public.trust_score_update_queue (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trust_score_update_queue ENABLE ROW LEVEL SECURITY;

-- Only system can manage this queue
CREATE POLICY "System can manage trust score queue"
  ON public.trust_score_update_queue
  FOR ALL
  USING (true);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_trust_score_queue_created 
  ON public.trust_score_update_queue(created_at);

-- Trigger to queue user for trust score update when they contribute
CREATE OR REPLACE FUNCTION queue_trust_score_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue the user for trust score recalculation
  INSERT INTO public.trust_score_update_queue (user_id, reason)
  VALUES (NEW.user_id, TG_TABLE_NAME || ' ' || TG_OP)
  ON CONFLICT (user_id) DO UPDATE SET created_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to contributions table
DROP TRIGGER IF EXISTS trigger_queue_trust_score_on_contribution ON public.contributions;
CREATE TRIGGER trigger_queue_trust_score_on_contribution
  AFTER INSERT OR UPDATE ON public.contributions
  FOR EACH ROW
  EXECUTE FUNCTION queue_trust_score_update();

-- Attach trigger to messages table (for chat activity scoring)
DROP TRIGGER IF EXISTS trigger_queue_trust_score_on_message ON public.messages;
CREATE TRIGGER trigger_queue_trust_score_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.sender_id IS NOT NULL)
  EXECUTE FUNCTION queue_trust_score_update();

-- Comment explaining the system
COMMENT ON TABLE public.trust_score_update_queue IS 'Queue of users whose trust scores need recalculation due to recent activity. Processed by calculate-trust-scores cron job.';