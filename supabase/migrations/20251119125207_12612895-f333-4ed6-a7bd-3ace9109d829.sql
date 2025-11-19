-- Function to auto-delete old notifications keeping only 7 most recent per user
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete old notifications, keeping only the 7 most recent for this user
  DELETE FROM public.user_notifications
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM public.user_notifications
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 7
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically cleanup after new notification is inserted
DROP TRIGGER IF EXISTS trigger_cleanup_old_notifications ON public.user_notifications;
CREATE TRIGGER trigger_cleanup_old_notifications
  AFTER INSERT ON public.user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_notifications();