-- Enable RLS and create policies for rosca_groups table
ALTER TABLE rosca_groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view active groups" ON rosca_groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON rosca_groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON rosca_groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON rosca_groups;

-- Create comprehensive RLS policies for rosca_groups
CREATE POLICY "Anyone can view active groups"
  ON rosca_groups FOR SELECT
  USING (status = 'active');

CREATE POLICY "Authenticated users can create groups"
  ON rosca_groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups"
  ON rosca_groups FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can delete their groups"
  ON rosca_groups FOR DELETE
  USING (auth.uid() = created_by);

-- Ensure trust_scores table exists with proper structure
CREATE TABLE IF NOT EXISTS trust_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES rosca_groups(id) ON DELETE CASCADE,
  score integer DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  contributions_on_time integer DEFAULT 0,
  contributions_late integer DEFAULT 0,
  missed_contributions integer DEFAULT 0,
  total_contributions integer DEFAULT 0,
  payment_rate numeric DEFAULT 100.0,
  last_update timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, group_id)
);

-- Enable RLS on trust_scores
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trust_scores
DROP POLICY IF EXISTS "Users can view their own trust scores" ON trust_scores;
DROP POLICY IF EXISTS "Users can view trust scores of group members" ON trust_scores;

CREATE POLICY "Users can view their own trust scores"
  ON trust_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view trust scores of group members"
  ON trust_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
      AND gm2.user_id = trust_scores.user_id
      AND gm1.group_id = trust_scores.group_id
    )
  );

-- Update RLS policies for contributions to allow viewing by group members
DROP POLICY IF EXISTS "Users can create their own contributions" ON contributions;
DROP POLICY IF EXISTS "Users can view their own contributions" ON contributions;

CREATE POLICY "Users can create their own contributions"
  ON contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own contributions"
  ON contributions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Group members can view group contributions"
  ON contributions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = contributions.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trust_scores_user_group ON trust_scores(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_contributions_group_user ON contributions(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_rosca_groups_creator ON rosca_groups(created_by);