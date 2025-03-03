-- Fix RLS policies to allow all authenticated users to see all properties
ALTER TABLE property_analyses ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "view_shared_properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view own or shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Select allowed for authenticated" ON property_analyses;
DROP POLICY IF EXISTS "Users can view their own properties" ON property_analyses;

-- Create a simple policy that allows all authenticated users to see all properties
CREATE POLICY "All users can view all properties"
ON property_analyses
FOR SELECT
TO authenticated
USING (true);

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