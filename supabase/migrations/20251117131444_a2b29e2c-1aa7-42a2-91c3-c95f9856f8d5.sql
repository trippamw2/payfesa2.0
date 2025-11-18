-- Ensure pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Force reset superadmin password to a known secure value
UPDATE admin_users 
SET password_hash = crypt('AdminPayFesa2025!', gen_salt('bf', 10)), updated_at = now()
WHERE username = 'superadmin';

-- Activate the account just in case
UPDATE admin_users SET is_active = true WHERE username = 'superadmin';