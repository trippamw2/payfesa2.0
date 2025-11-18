-- Drop rosca_groups if it exists and recreate with correct structure
DROP TABLE IF EXISTS rosca_groups CASCADE;

CREATE TABLE rosca_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  description text,
  amount numeric NOT NULL,
  contribution_amount numeric,
  frequency varchar NOT NULL DEFAULT 'monthly',
  max_members integer NOT NULL,
  current_members integer DEFAULT 0,
  group_code varchar UNIQUE NOT NULL DEFAULT substring(md5(random()::text || clock_timestamp()::text) from 1 for 8),
  creator_id uuid,
  created_by uuid,
  status varchar DEFAULT 'active',
  start_date date,
  next_contribution_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE rosca_groups ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies
CREATE POLICY "Anyone can view groups"
  ON rosca_groups FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create groups"
  ON rosca_groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update groups"
  ON rosca_groups FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete groups"
  ON rosca_groups FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_rosca_groups_updated_at
  BEFORE UPDATE ON rosca_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to sync amount fields
CREATE OR REPLACE FUNCTION sync_rosca_groups_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync contribution_amount to amount if contribution_amount is provided
  IF NEW.contribution_amount IS NOT NULL AND NEW.amount IS NULL THEN
    NEW.amount := NEW.contribution_amount;
  END IF;
  -- Sync created_by to creator_id if created_by is provided
  IF NEW.created_by IS NOT NULL AND NEW.creator_id IS NULL THEN
    NEW.creator_id := NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_rosca_groups_fields
  BEFORE INSERT OR UPDATE ON rosca_groups
  FOR EACH ROW
  EXECUTE FUNCTION sync_rosca_groups_amount();

-- Add index
CREATE INDEX idx_rosca_groups_group_code ON rosca_groups(group_code);
CREATE INDEX idx_rosca_groups_creator ON rosca_groups(creator_id);
CREATE INDEX idx_rosca_groups_created_by ON rosca_groups(created_by);