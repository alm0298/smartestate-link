-- Comprehensive fix for RLS policies to avoid infinite recursion

-- First, let's check all existing policies on the property_analyses table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'property_analyses';

-- Now, let's disable RLS temporarily to see if that's the issue
ALTER TABLE property_analyses DISABLE ROW LEVEL SECURITY;

-- Let's check if there are any triggers that might be causing recursion
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    tgtype,
    tgenabled,
    tgfoid::regproc AS function_name
FROM pg_trigger
WHERE tgrelid = 'property_analyses'::regclass;

-- Now, let's drop ALL policies on the property_analyses table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'property_analyses'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON property_analyses';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE property_analyses ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- 1. Policy for viewing own properties
CREATE POLICY "view_own_properties"
ON property_analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Policy for viewing shared properties
CREATE POLICY "view_shared_properties"
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
CREATE POLICY "insert_own_properties"
ON property_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Policy for updating properties (only own)
CREATE POLICY "update_own_properties"
ON property_analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Policy for deleting properties (only own)
CREATE POLICY "delete_own_properties"
ON property_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Check if the policies were created successfully
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'property_analyses';

-- Let's also check the property_shares table policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'property_shares';

-- Fix property_shares policies if needed
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'property_shares'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON property_shares';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Create simple policies for property_shares
-- 1. Policy for viewing shares
CREATE POLICY "view_all_shares"
ON property_shares
FOR SELECT
TO authenticated
USING (TRUE);

-- 2. Policy for creating shares (only for properties you own)
CREATE POLICY "create_shares_for_own_properties"
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
CREATE POLICY "delete_own_shares"
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

-- Final check of all policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename IN ('property_analyses', 'property_shares'); 