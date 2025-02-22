-- Add images column to property_analyses table
ALTER TABLE property_analyses
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'::TEXT[]; 