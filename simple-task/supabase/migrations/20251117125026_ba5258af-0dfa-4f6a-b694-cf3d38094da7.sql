-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create function to encrypt API keys
CREATE OR REPLACE FUNCTION encrypt_api_key(p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(p_key, current_setting('app.encryption_key')), 'base64');
END;
$$;

-- Create function to decrypt API keys
CREATE OR REPLACE FUNCTION decrypt_api_key(p_encrypted_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(p_encrypted_key, 'base64'), current_setting('app.encryption_key'));
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Add encrypted columns to api_configurations
ALTER TABLE api_configurations
ADD COLUMN IF NOT EXISTS api_key_encrypted text,
ADD COLUMN IF NOT EXISTS api_secret_encrypted text,
ADD COLUMN IF NOT EXISTS webhook_secret_encrypted text;

-- Create payment disputes table
CREATE TABLE IF NOT EXISTS payment_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  dispute_type varchar(50) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL,
  reason text NOT NULL,
  evidence jsonb DEFAULT '{}',
  admin_notes text,
  resolved_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS for payment_disputes
ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment disputes
CREATE POLICY "Users can view their own disputes"
ON payment_disputes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create disputes"
ON payment_disputes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all disputes"
ON payment_disputes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can update disputes"
ON payment_disputes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(identifier, endpoint, window_start)
);

-- Enable RLS for rate_limits (admin only)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view rate limits"
ON rate_limits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Create function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests int DEFAULT 100,
  p_window_minutes int DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count int;
  v_window_start timestamptz;
  v_blocked_until timestamptz;
BEGIN
  -- Check if currently blocked
  SELECT blocked_until INTO v_blocked_until
  FROM rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND blocked_until > now()
  ORDER BY blocked_until DESC
  LIMIT 1;

  IF v_blocked_until IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked_until', v_blocked_until,
      'message', 'Rate limit exceeded'
    );
  END IF;

  -- Get or create rate limit record
  INSERT INTO rate_limits (identifier, endpoint, window_start, request_count)
  VALUES (
    p_identifier,
    p_endpoint,
    date_trunc('minute', now()),
    1
  )
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET
    request_count = rate_limits.request_count + 1
  RETURNING request_count, window_start INTO v_current_count, v_window_start;

  -- Check if limit exceeded
  IF v_current_count > p_max_requests THEN
    -- Block for 15 minutes
    UPDATE rate_limits
    SET blocked_until = now() + interval '15 minutes'
    WHERE identifier = p_identifier
      AND endpoint = p_endpoint
      AND window_start = v_window_start;

    RETURN jsonb_build_object(
      'allowed', false,
      'blocked_until', now() + interval '15 minutes',
      'message', 'Rate limit exceeded. Blocked for 15 minutes.'
    );
  END IF;

  -- Cleanup old records (older than 24 hours)
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '24 hours';

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_max_requests - v_current_count,
    'reset_at', v_window_start + (p_window_minutes * interval '1 minute')
  );
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_disputes_user_id ON payment_disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_status ON payment_disputes(status);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint ON rate_limits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Create trigger for payment_disputes updated_at
CREATE TRIGGER update_payment_disputes_updated_at
BEFORE UPDATE ON payment_disputes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();