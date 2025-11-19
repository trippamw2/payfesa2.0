-- Update PayChangu test configuration with provided test keys
UPDATE public.api_configurations 
SET 
  api_key = 'PUB-TEST-sqSWWO4MjWx3cZHZbRzouJUVzaokQ5rE',
  api_secret = 'SEC-TEST-j3MGDQJaNNuxaarJzYNfMmkJhDemr8cO',
  enabled = true,
  updated_at = now()
WHERE provider = 'paychangu' AND test_mode = true;