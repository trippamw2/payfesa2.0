-- Add missing queued_at column to trust_score_update_queue table
ALTER TABLE trust_score_update_queue 
ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();