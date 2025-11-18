-- Add missing foreign key constraint for contributions.group_id
ALTER TABLE public.contributions 
ADD CONSTRAINT contributions_group_id_fkey 
FOREIGN KEY (group_id) 
REFERENCES public.rosca_groups(id) 
ON DELETE CASCADE;