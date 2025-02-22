-- Create property_analyses table
CREATE TABLE IF NOT EXISTS property_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    address TEXT,
    price NUMERIC,
    monthly_rent NUMERIC,
    estimated_expenses NUMERIC,
    roi NUMERIC,
    location_lat NUMERIC,
    location_lng NUMERIC,
    property_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    area_analysis JSONB DEFAULT '{}'::jsonb,
    images TEXT[] DEFAULT '{}'
);

-- Add RLS policies
ALTER TABLE property_analyses ENABLE ROW LEVEL SECURITY;

-- Users can view their own properties
CREATE POLICY "Users can view own properties"
    ON property_analyses FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own properties
CREATE POLICY "Users can insert own properties"
    ON property_analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own properties
CREATE POLICY "Users can update own properties"
    ON property_analyses FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own properties
CREATE POLICY "Users can delete own properties"
    ON property_analyses FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_property_analyses_updated_at
    BEFORE UPDATE ON property_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 