-- Fix chat trust score trigger to work with messages.sender_id
CREATE OR REPLACE FUNCTION public.queue_trust_score_update_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only queue for user messages, not system messages
  IF NEW.sender_id IS NOT NULL AND NEW.message_type = 'user' THEN
    INSERT INTO public.trust_score_update_queue (user_id, reason)
    VALUES (NEW.sender_id, 'message_activity')
    ON CONFLICT (user_id) DO UPDATE SET
      created_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update trigger on messages table to use the correct function
DROP TRIGGER IF EXISTS trigger_queue_trust_score_on_message ON public.messages;
CREATE TRIGGER trigger_queue_trust_score_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.sender_id IS NOT NULL)
  EXECUTE FUNCTION public.queue_trust_score_update_on_message();