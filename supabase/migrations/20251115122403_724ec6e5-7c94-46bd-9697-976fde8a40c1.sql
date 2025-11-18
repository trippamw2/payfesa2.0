-- Create a function to ensure admin users have proper auth accounts and roles
CREATE OR REPLACE FUNCTION public.ensure_admin_user_auth(p_admin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_user record;
  v_auth_user_id uuid;
  v_result jsonb;
BEGIN
  -- Get admin user details
  SELECT * INTO v_admin_user
  FROM public.admin_users
  WHERE id = p_admin_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin user not found');
  END IF;
  
  -- Check if admin already has a linked user_id
  IF v_admin_user.user_id IS NOT NULL THEN
    -- Ensure they have admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_admin_user.user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN jsonb_build_object(
      'success', true,
      'user_id', v_admin_user.user_id,
      'message', 'Admin role ensured'
    );
  END IF;
  
  -- If no user_id, we need to find or create auth user
  -- First check if there's an auth user with matching email
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = v_admin_user.email
  LIMIT 1;
  
  IF v_auth_user_id IS NOT NULL THEN
    -- Link the admin to existing auth user
    UPDATE public.admin_users
    SET user_id = v_auth_user_id
    WHERE id = p_admin_id;
    
    -- Add admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_auth_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN jsonb_build_object(
      'success', true,
      'user_id', v_auth_user_id,
      'message', 'Admin linked to existing auth user'
    );
  END IF;
  
  -- No matching auth user found
  RETURN jsonb_build_object(
    'success', false,
    'error', 'No auth user found for admin',
    'suggestion', 'Admin needs to sign up with their email first'
  );
END;
$$;

-- Set up the superadmin user properly
DO $$
DECLARE
  v_superadmin_id uuid;
  v_result jsonb;
BEGIN
  -- Get superadmin id
  SELECT id INTO v_superadmin_id
  FROM public.admin_users
  WHERE username = 'superadmin';
  
  IF v_superadmin_id IS NOT NULL THEN
    v_result := public.ensure_admin_user_auth(v_superadmin_id);
    RAISE NOTICE 'Superadmin setup result: %', v_result;
  END IF;
END $$;