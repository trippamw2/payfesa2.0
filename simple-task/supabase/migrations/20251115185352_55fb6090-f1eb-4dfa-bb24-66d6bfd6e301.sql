-- Drop the old unique constraint on provider
ALTER TABLE api_configurations DROP CONSTRAINT IF EXISTS api_configurations_provider_key;

-- Add a new unique constraint on (provider, test_mode) combination
ALTER TABLE api_configurations ADD CONSTRAINT api_configurations_provider_test_mode_key 
  UNIQUE (provider, test_mode);

-- Add helpful comment
COMMENT ON CONSTRAINT api_configurations_provider_test_mode_key ON api_configurations IS 
  'Ensures only one configuration per provider per mode (test/live)';