
-- Fix the verify_password function to properly verify bcrypt hashes
CREATE OR REPLACE FUNCTION public.verify_password(p_password text, p_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- For bcrypt, we verify by hashing the password with the stored hash as salt
  -- If it matches, the password is correct
  RETURN (crypt(p_password, p_hash) = p_hash);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Password verification failed: %', SQLERRM;
    RETURN false;
END;
$$;

-- Reset superadmin password with a fresh bcrypt hash
UPDATE admin_users 
SET 
  password_hash = crypt('AdminPayFesa2025!', gen_salt('bf', 10)),
  is_active = true,
  updated_at = now()
WHERE username = 'superadmin';

-- Verify it works
DO $$
DECLARE
  v_hash text;
  v_result boolean;
BEGIN
  SELECT password_hash INTO v_hash FROM admin_users WHERE username = 'superadmin';
  SELECT verify_password('AdminPayFesa2025!', v_hash) INTO v_result;
  
  IF v_result THEN
    RAISE NOTICE 'Password verification test: SUCCESS';
  ELSE
    RAISE WARNING 'Password verification test: FAILED';
  END IF;
END $$;
