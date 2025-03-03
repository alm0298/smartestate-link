-- Add new analysis fields to property_analyses table
ALTER TABLE property_analyses
ADD COLUMN IF NOT EXISTS pros TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cons TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS score NUMERIC CHECK (score >= 0 AND score <= 5) DEFAULT 0; 