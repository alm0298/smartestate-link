-- Fix RLS policies to avoid infinite recursion

-- STEP 1: Enable RLS if it's not already enabled
ALTER TABLE property_analyses ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop all existing policies to avoid conflicts
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

-- STEP 3: Create the property_shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS property_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES property_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, user_id)
);

-- STEP 4: Enable RLS on property_shares table
ALTER TABLE property_shares ENABLE ROW LEVEL SECURITY;

-- STEP 5: Drop all existing policies on property_shares
DROP POLICY IF EXISTS "Users can view shared properties" ON property_shares;
DROP POLICY IF EXISTS "Users can create shares for own properties" ON property_shares;
DROP POLICY IF EXISTS "Users can delete shares for own properties" ON property_shares;

-- STEP 6: Create simplified policies for property_analyses
-- 1. Policy for viewing properties (own)
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

-- 3. Policy for inserting properties (only own)
CREATE POLICY "Users can insert own properties"
ON property_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Policy for updating properties (only own)
CREATE POLICY "Users can update own properties"
ON property_analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Policy for deleting properties (only own)
CREATE POLICY "Users can delete own properties"
ON property_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- STEP 7: Create simplified policies for property_shares
-- 1. Policy for viewing shares
CREATE POLICY "Users can view all shares"
ON property_shares
FOR SELECT
TO authenticated
USING (TRUE);

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

-- 3. Policy for deleting shares (only for properties you own or shares for you)
CREATE POLICY "Users can delete own shares"
ON property_shares
FOR DELETE
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