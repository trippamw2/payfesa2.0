-- Add columns to messages table for enhanced chat features
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'user' CHECK (message_type IN ('user', 'system', 'announcement')),
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for pinned messages
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON public.messages(group_id, is_pinned) WHERE is_pinned = true;

-- Create index for message type
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(group_id, message_type);

-- Update RLS policies for messages to allow system messages
DROP POLICY IF EXISTS "Users can view messages in their groups" ON public.messages;
CREATE POLICY "Users can view messages in their groups"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = messages.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Allow service role to insert system messages
DROP POLICY IF EXISTS "Users can send messages to their groups" ON public.messages;
CREATE POLICY "Users can send messages to their groups"
ON public.messages FOR INSERT
WITH CHECK (
  (sender_id = auth.uid() AND message_type = 'user') OR
  (sender_id IS NULL AND message_type IN ('system', 'announcement'))
);

-- Allow group admins to pin/unpin messages
CREATE POLICY "Group admins can update messages"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.rosca_groups
    WHERE rosca_groups.id = messages.group_id
    AND rosca_groups.creator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rosca_groups
    WHERE rosca_groups.id = messages.group_id
    AND rosca_groups.creator_id = auth.uid()
  )
);

-- Create function to send system message
CREATE OR REPLACE FUNCTION public.send_system_message(
  p_group_id UUID,
  p_message TEXT,
  p_message_type VARCHAR DEFAULT 'system',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  INSERT INTO public.messages (group_id, message, message_type, metadata, sender_id)
  VALUES (p_group_id, p_message, p_message_type, p_metadata, NULL)
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$;