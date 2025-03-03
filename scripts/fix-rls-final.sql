-- Final fix for RLS policies to avoid infinite recursion

-- First, drop all existing policies that might conflict
DROP POLICY IF EXISTS "Users can view own properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view own or shared properties" ON property_analyses;

-- Now create the two separate policies
-- 1. Policy for viewing own properties
CREATE POLICY "Users can view own properties"
ON property_analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Policy for viewing shared properties
CREATE POLICY "Users can view shared properties"
ON property_analyses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM property_shares
    WHERE property_shares.property_id = property_analyses.id
    AND property_shares.user_id = auth.uid()
  )
);

-- Check if the policies were created successfully
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'property_analyses' 
AND policyname IN ('Users can view own properties', 'Users can view shared properties'); 