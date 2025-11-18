-- Fix security definer view (ERROR level issue)
-- Drop and recreate vw_admin_users_safe as a regular view without SECURITY DEFINER
DROP VIEW IF EXISTS public.vw_admin_users_safe;

CREATE VIEW public.vw_admin_users_safe AS
SELECT 
  id,
  username,
  email,
  is_active,
  is_email_verified,
  role_id,
  permissions,
  created_at,
  updated_at,
  last_login_at
FROM public.admin_users;

-- Add search_path to security definer functions (WARN level issues)
-- Fix jwt_has_role function
CREATE OR REPLACE FUNCTION public.jwt_has_role(role_text text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select (auth.jwt() ->> 'role') = role_text;
$$;

-- Fix verify_user_pin function
CREATE OR REPLACE FUNCTION public.verify_user_pin(p_user uuid, p_pin_hash text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select (select pin_hash from public.users where id = p_user) = p_pin_hash;
$$;

-- Fix current_auth_user function
CREATE OR REPLACE FUNCTION public.current_auth_user()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select auth.uid();
$$;

-- Fix get_sensitive_user_flag function
CREATE OR REPLACE FUNCTION public.get_sensitive_user_flag(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.is_sensitive
  FROM public.admin_only_sensitive_users a
  WHERE a.user_id = target_user_id
  LIMIT 1;
$$;

-- Fix get_admin_permissions function
CREATE OR REPLACE FUNCTION public.get_admin_permissions(p_admin_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(permissions, '[]'::jsonb) FROM public.admin_users WHERE id = p_admin_id;
$$;

-- Fix has_admin_permission function
CREATE OR REPLACE FUNCTION public.has_admin_permission(p_admin_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(
      COALESCE((SELECT permissions FROM public.admin_users WHERE id = p_admin_id), '[]'::jsonb)
    ) AS perm
    WHERE perm = p_permission
  );
$$;