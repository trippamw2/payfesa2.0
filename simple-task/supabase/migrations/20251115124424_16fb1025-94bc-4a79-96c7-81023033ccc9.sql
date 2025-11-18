-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Reset superadmin password to the provided value and ensure active/email
UPDATE public.admin_users
SET 
  password_hash = crypt('AdminPayFesa2025!', gen_salt('bf', 12)),
  is_active = true,
  email = COALESCE(email, 'admin@payfesa.com'),
  updated_at = now()
WHERE username = 'superadmin';

-- Optionally ensure role link if function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'ensure_admin_user_auth'
  ) THEN
    PERFORM public.ensure_admin_user_auth((SELECT id FROM public.admin_users WHERE username='superadmin'));
  END IF;
END $$;