-- Add area_analysis column if it doesn't exist
ALTER TABLE property_analyses
ADD COLUMN IF NOT EXISTS area_analysis JSONB DEFAULT '{}'::jsonb; 