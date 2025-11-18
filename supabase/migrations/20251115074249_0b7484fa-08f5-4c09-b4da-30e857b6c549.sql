-- Fix group_members table to use composite primary key and add proper RLS
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_pkey CASCADE;
ALTER TABLE group_members ADD PRIMARY KEY (group_id, user_id);

-- Drop and recreate RLS policies for group_members
DROP POLICY IF EXISTS "Users can view their own group memberships" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Members can update their membership" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_block" ON group_members;
DROP POLICY IF EXISTS "group_members_insert" ON group_members;

-- Create comprehensive RLS policies for group_members
CREATE POLICY "Users can view all group memberships"
  ON group_members FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert group memberships"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own membership"
  ON group_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own membership"
  ON group_members FOR DELETE
  USING (auth.uid() = user_id);

-- Update messages RLS policies for better access
DROP POLICY IF EXISTS "Group members can view group messages" ON messages;
DROP POLICY IF EXISTS "Group members can insert messages" ON messages;

CREATE POLICY "Anyone can view messages"
  ON messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);