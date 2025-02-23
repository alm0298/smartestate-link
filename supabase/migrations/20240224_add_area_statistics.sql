-- Create area_statistics table
CREATE TABLE IF NOT EXISTS area_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_name TEXT NOT NULL,
    average_price_per_meter NUMERIC NOT NULL,
    data_source TEXT,
    last_updated TIMESTAMP WITH TIME ZONE,
    trend_percentage NUMERIC,
    cached_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cache_valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Add a unique constraint on area_name to make upsert work properly
    CONSTRAINT unique_area_name UNIQUE (area_name)
);

-- Add indexes
CREATE INDEX idx_area_statistics_area_name ON area_statistics (area_name);
CREATE INDEX idx_area_statistics_cache_valid_until ON area_statistics (cache_valid_until);

-- Add RLS policies
ALTER TABLE area_statistics ENABLE ROW LEVEL SECURITY;

-- Everyone can read area statistics
CREATE POLICY "Everyone can read area statistics"
    ON area_statistics FOR SELECT
    USING (true);

-- Only authenticated users can insert/update area statistics
CREATE POLICY "Authenticated users can insert area statistics"
    ON area_statistics FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update area statistics"
    ON area_statistics FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated'); 