-- Drop the old constraint
ALTER TABLE api_configurations 
DROP CONSTRAINT IF EXISTS valid_provider;

-- Add new constraint that includes paychangu
ALTER TABLE api_configurations 
ADD CONSTRAINT valid_provider 
CHECK (provider IN ('airtel', 'tnm', 'paychangu'));