-- Add fee_amount column to payouts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payouts' AND column_name = 'fee_amount'
    ) THEN
        ALTER TABLE public.payouts ADD COLUMN fee_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- Update existing payouts to calculate 9% fee
UPDATE public.payouts 
SET fee_amount = gross_amount * 0.09 
WHERE fee_amount = 0 OR fee_amount IS NULL;

-- Drop unused tables that are not referenced in the application
DROP TABLE IF EXISTS public.app_users CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.phone_numbers CASCADE;
DROP TABLE IF EXISTS public.language CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.realtime_messages CASCADE;
DROP TABLE IF EXISTS public.typing_indicators CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.wallet_balance CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.reminder_logs CASCADE;
DROP TABLE IF EXISTS public.reminder_schedules CASCADE;
DROP TABLE IF EXISTS public.content_categories CASCADE;
DROP TABLE IF EXISTS public.content_pages CASCADE;
DROP TABLE IF EXISTS public.admin_ussd_menu_items CASCADE;
DROP TABLE IF EXISTS public.admin_trust_credit_parameters CASCADE;
DROP TABLE IF EXISTS public.merchant_wallet_balances CASCADE;
DROP TABLE IF EXISTS public.health_checks CASCADE;
DROP TABLE IF EXISTS public.alert_logs CASCADE;
DROP TABLE IF EXISTS public.automated_alerts CASCADE;
DROP TABLE IF EXISTS public.notification_recipients CASCADE;
DROP TABLE IF EXISTS public.operational_costs CASCADE;
DROP TABLE IF EXISTS public.transaction_reconciliation CASCADE;
DROP TABLE IF EXISTS public.user_achievements CASCADE;

-- Drop unused functions
DROP FUNCTION IF EXISTS public.process_automated_reminders() CASCADE;
DROP FUNCTION IF EXISTS public.send_system_message(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_fees(numeric, boolean, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.process_payout_with_revenue(uuid, uuid, uuid, numeric, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.get_revenue_summary(date, date) CASCADE;
DROP FUNCTION IF EXISTS public.process_contribution_with_escrow(uuid, uuid, numeric, varchar) CASCADE;
DROP FUNCTION IF EXISTS public.process_payout_from_escrow(uuid, uuid, numeric, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_escrow_summary(uuid) CASCADE;