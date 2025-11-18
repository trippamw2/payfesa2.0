-- Fix security warnings for new automation functions by setting search_path

ALTER FUNCTION queue_trust_score_update_on_contribution() 
SET search_path = public;

ALTER FUNCTION queue_trust_score_update_on_message() 
SET search_path = public;

ALTER FUNCTION auto_update_payout_positions() 
SET search_path = public;

ALTER FUNCTION check_achievements_on_group_join() 
SET search_path = public;

ALTER FUNCTION notify_group_active() 
SET search_path = public;
