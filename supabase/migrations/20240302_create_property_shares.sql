-- Create property_shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS property_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES property_analyses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(property_id, user_id)
);

-- Enable RLS on property_shares table
ALTER TABLE property_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view shared properties" ON property_shares;
DROP POLICY IF EXISTS "Users can create shares for own properties" ON property_shares;
DROP POLICY IF EXISTS "Users can delete shares for own properties" ON property_shares;

-- Create policies for property_shares table
-- 1. Policy for viewing shares (own properties or shared with you)
CREATE POLICY "Users can view shared properties"
ON property_shares
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM property_analyses
        WHERE property_analyses.id = property_shares.property_id
        AND property_analyses.user_id = auth.uid()
    )
    OR
    user_id = auth.uid()
);

-- 2. Policy for creating shares (only for properties you own)
CREATE POLICY "Users can create shares for own properties"
ON property_shares
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM property_analyses
        WHERE property_analyses.id = property_shares.property_id
        AND property_analyses.user_id = auth.uid()
    )
);

-- 3. Policy for deleting shares (only for properties you own)
CREATE POLICY "Users can delete shares for own properties"
ON property_shares
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM property_analyses
        WHERE property_analyses.id = property_shares.property_id
        AND property_analyses.user_id = auth.uid()
    )
);

-- Insert existing properties for shai.yag@gmail.com
INSERT INTO property_shares (property_id, user_id)
SELECT 
    property_analyses.id,
    auth.users.id
FROM 
    property_analyses
CROSS JOIN 
    auth.users
WHERE 
    auth.users.email = 'shai.yag@gmail.com'
ON CONFLICT (property_id, user_id) DO NOTHING; 