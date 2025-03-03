-- ESSENTIAL FIX FOR RLS POLICIES
-- This script focuses only on the critical changes needed

-- Ensure RLS is enabled on the property_analyses table
ALTER TABLE property_analyses ENABLE ROW LEVEL SECURITY;

-- Drop any problematic policies
DROP POLICY IF EXISTS "view_shared_properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view own or shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Select allowed for authenticated" ON property_analyses;
DROP POLICY IF EXISTS "Users can view their own properties" ON property_analyses;

-- Create policies for viewing properties (owned or shared)
CREATE POLICY "Users can view their own properties"
ON property_analyses
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

CREATE POLICY "Users can view shared properties"
ON property_analyses
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM property_shares 
        WHERE 
            property_shares.property_id = property_analyses.id 
            AND property_shares.user_id = auth.uid()
    )
);

-- Create policies for managing properties (insert, update, delete)
CREATE POLICY "Users can insert their own properties"
ON property_analyses
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

CREATE POLICY "Users can update their own properties"
ON property_analyses
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
);

CREATE POLICY "Users can delete their own properties"
ON property_analyses
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
);

-- Confirm current policies after changes
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd 
FROM pg_policies 
WHERE tablename = 'property_analyses';

-- Create a test share between users (if needed)
-- Replace with actual user IDs and property IDs before running
/*
INSERT INTO property_shares (property_id, user_id)
VALUES 
    ('property-id-here', 'user-id-to-share-with-here');
*/ 