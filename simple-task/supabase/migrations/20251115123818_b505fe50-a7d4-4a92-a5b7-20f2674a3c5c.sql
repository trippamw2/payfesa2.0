-- Enable pgcrypto for bcrypt verification
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function to verify a plaintext password against a bcrypt hash
CREATE OR REPLACE FUNCTION public.verify_password(p_password text, p_hash text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT crypt(p_password, p_hash) = p_hash;
$$;

-- Allow execution from typical app roles
GRANT EXECUTE ON FUNCTION public.verify_password(text, text) TO anon, authenticated, service_role;