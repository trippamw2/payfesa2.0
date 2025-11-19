-- Trigger function for payment disputes
CREATE OR REPLACE FUNCTION public.notify_dispute() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_name TEXT;
  v_dispute_type TEXT;
  v_amount TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
BEGIN
  -- Get user name
  SELECT name INTO v_user_name FROM users WHERE id = NEW.user_id;
  v_amount := NEW.amount || ' MWK';
  v_dispute_type := NEW.dispute_type;
  
  -- Handle new dispute creation
  IF TG_OP = 'INSERT' THEN
    v_notification_title := '⚠️ Dispute Submitted';
    v_notification_message := 'Your dispute for ' || v_amount || ' has been submitted. Our team will review it within 24 hours.';
    
    INSERT INTO user_notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      'system',
      v_notification_title,
      v_notification_message,
      jsonb_build_object('dispute_id', NEW.id, 'amount', NEW.amount, 'dispute_type', v_dispute_type)
    );
    
  -- Handle dispute resolution
  ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
    IF NEW.status = 'resolved' THEN
      v_notification_title := '✅ Dispute Resolved';
      v_notification_message := 'Your dispute for ' || v_amount || ' has been resolved. ' || 
        COALESCE(NEW.admin_notes, 'Thank you for your patience.');
    ELSIF NEW.status = 'rejected' THEN
      v_notification_title := '❌ Dispute Rejected';
      v_notification_message := 'Your dispute for ' || v_amount || ' has been reviewed. ' || 
        COALESCE(NEW.admin_notes, 'Please contact support for more details.');
    END IF;
    
    INSERT INTO user_notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      'system',
      v_notification_title,
      v_notification_message,
      jsonb_build_object('dispute_id', NEW.id, 'amount', NEW.amount, 'dispute_type', v_dispute_type, 'status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for disputes
DROP TRIGGER IF EXISTS on_dispute_status_change ON payment_disputes;
CREATE TRIGGER on_dispute_status_change
  AFTER INSERT OR UPDATE ON payment_disputes
  FOR EACH ROW
  EXECUTE FUNCTION notify_dispute();