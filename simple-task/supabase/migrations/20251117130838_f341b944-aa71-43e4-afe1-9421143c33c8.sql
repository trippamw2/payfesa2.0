-- Reset superadmin password
-- Password: AdminPayFesa2025
-- This uses bcrypt with the pgcrypto extension

-- First ensure pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update superadmin password with bcrypt hash
-- The crypt function will generate a new bcrypt hash for the password
UPDATE admin_users 
SET password_hash = crypt('AdminPayFesa2025', gen_salt('bf', 10))
WHERE username = 'superadmin';

-- If superadmin doesn't exist, create it
INSERT INTO admin_users (username, email, password_hash, is_active)
SELECT 'superadmin', 'admin@payfesa.com', crypt('AdminPayFesa2025', gen_salt('bf', 10)), true
WHERE NOT EXISTS (
  SELECT 1 FROM admin_users WHERE username = 'superadmin'
);

-- Log the update
DO $$
BEGIN
  RAISE NOTICE 'Superadmin password has been reset to: AdminPayFesa2025';
  RAISE NOTICE 'Username: superadmin';
END $$;