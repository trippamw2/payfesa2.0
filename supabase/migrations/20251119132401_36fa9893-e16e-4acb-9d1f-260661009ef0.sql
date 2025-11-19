-- Create storage bucket for group chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-chat-images', 'group-chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for group chat images bucket
CREATE POLICY "Users can upload images to their groups"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'group-chat-images' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = 'group-images' AND
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id::text = (storage.foldername(name))[2]
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view images from their groups"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'group-chat-images' AND
  (
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = 'group-images' AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id::text = (storage.foldername(name))[2]
      AND group_members.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete their own uploaded images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'group-chat-images' AND
  auth.uid() = owner
);