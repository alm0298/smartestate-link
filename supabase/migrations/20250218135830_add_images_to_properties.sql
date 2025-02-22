-- Add images array column to property_analyses table
ALTER TABLE property_analyses
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Add location columns if they don't exist
ALTER TABLE property_analyses
ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
