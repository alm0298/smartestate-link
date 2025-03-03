-- Script to bypass RLS and allow all users to view all properties

-- First, verify that RLS is enabled
SELECT 
    relname AS table_name,
    relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'property_analyses';

-- Drop existing RLS policies that may interfere
DROP POLICY IF EXISTS "view_shared_properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view own or shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Select allowed for authenticated" ON property_analyses;
DROP POLICY IF EXISTS "Users can view their own properties" ON property_analyses;
DROP POLICY IF EXISTS "All users can view all properties" ON property_analyses;

-- Ensure RLS is enabled
ALTER TABLE property_analyses ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows ALL authenticated users to view ALL properties
CREATE POLICY "All users can view all properties"
ON property_analyses
FOR SELECT
TO authenticated
USING (true);

-- Create policies for managing properties - only owners can modify their own
CREATE POLICY "Users can insert their own properties"
ON property_analyses
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own properties"
ON property_analyses
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own properties"
ON property_analyses
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Verify that the policies are correctly set
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'property_analyses'; 