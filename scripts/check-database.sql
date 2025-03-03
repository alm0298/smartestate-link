-- Check property_analyses table
SELECT COUNT(*) AS total_properties FROM property_analyses;

-- Show all properties
SELECT id, user_id, address, created_at FROM property_analyses ORDER BY created_at DESC;

-- Check property_shares table
SELECT COUNT(*) AS total_shares FROM property_shares;

-- Show all property shares
SELECT id, property_id, user_id, created_at FROM property_shares ORDER BY created_at DESC;

-- Show properties with shares
SELECT 
  p.id AS property_id, 
  p.address, 
  p.user_id AS owner_id,
  COUNT(ps.id) AS share_count,
  array_agg(ps.user_id) AS shared_with_users
FROM 
  property_analyses p
JOIN 
  property_shares ps ON p.id = ps.property_id
GROUP BY 
  p.id, p.address, p.user_id
ORDER BY 
  share_count DESC;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'property_analyses';

-- Clean up RLS policies (run this if you want to remove all policies and create clean ones)
/*
-- First, drop all existing policies
DROP POLICY IF EXISTS "Agents can see all properties they created" ON property_analyses;
DROP POLICY IF EXISTS "Allow public insert access" ON property_analyses;
DROP POLICY IF EXISTS "Allow public read access" ON property_analyses;
DROP POLICY IF EXISTS "Allow select for owners" ON property_analyses;
DROP POLICY IF EXISTS "Clients can see properties shared with them" ON property_analyses;
DROP POLICY IF EXISTS "Enable delete for property owners" ON property_analyses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON property_analyses;
DROP POLICY IF EXISTS "Enable update for property owners" ON property_analyses;
DROP POLICY IF EXISTS "Users can create their own analyses" ON property_analyses;
DROP POLICY IF EXISTS "Users can delete own properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can delete their own analyses" ON property_analyses;
DROP POLICY IF EXISTS "Users can insert own properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can update own properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON property_analyses;
DROP POLICY IF EXISTS "Users can view own or shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view their own analyses" ON property_analyses;
DROP POLICY IF EXISTS "property_analyses_delete_policy" ON property_analyses;
DROP POLICY IF EXISTS "property_analyses_insert_policy" ON property_analyses;
DROP POLICY IF EXISTS "property_analyses_select_policy" ON property_analyses;
DROP POLICY IF EXISTS "property_analyses_update_policy" ON property_analyses;

-- Now create just the policies we need
-- 1. Policy for viewing properties (own or shared)
CREATE POLICY "Users can view own or shared properties"
ON property_analyses
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM property_shares
    WHERE property_shares.property_id = property_analyses.id
    AND property_shares.user_id = auth.uid()
  )
);

-- 2. Policy for inserting properties (only own)
CREATE POLICY "Users can insert own properties"
ON property_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Policy for updating properties (only own)
CREATE POLICY "Users can update own properties"
ON property_analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Policy for deleting properties (only own)
CREATE POLICY "Users can delete own properties"
ON property_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
*/ 