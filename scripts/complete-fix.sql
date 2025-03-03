-- COMPREHENSIVE FIX SCRIPT
-- This script will:
-- 1. Fix all RLS policies
-- 2. Find all users in the system
-- 3. Find all properties
-- 4. Share a property from the original user to the new user

-- STEP 1: Fix RLS policies
-- First, disable RLS temporarily
ALTER TABLE property_analyses DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on property_analyses
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
  id IN (
    SELECT property_id 
    FROM property_shares 
    WHERE user_id = auth.uid()
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

-- Fix property_shares policies
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

-- STEP 2: Create a function to share properties
CREATE OR REPLACE FUNCTION share_property(
    property_id UUID,
    shared_with_user_id UUID
) RETURNS VOID AS $$
BEGIN
    -- Check if the share already exists
    IF NOT EXISTS (
        SELECT 1 FROM property_shares 
        WHERE property_id = share_property.property_id 
        AND user_id = share_property.shared_with_user_id
    ) THEN
        -- Insert the share
        INSERT INTO property_shares (property_id, user_id)
        VALUES (share_property.property_id, share_property.shared_with_user_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Find all users in the system
SELECT 
    id AS user_id, 
    email, 
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at;

-- STEP 4: Find all properties
SELECT 
    id AS property_id, 
    address, 
    user_id AS owner_id,
    created_at
FROM property_analyses
ORDER BY created_at DESC;

-- STEP 5: Automatically share properties between users
DO $$
DECLARE
    original_user_id UUID;
    new_user_id UUID;
    property_to_share UUID;
BEGIN
    -- Get the first user (original user)
    SELECT id INTO original_user_id
    FROM auth.users
    ORDER BY created_at
    LIMIT 1;
    
    -- Get the second user (new user)
    SELECT id INTO new_user_id
    FROM auth.users
    WHERE id != original_user_id
    ORDER BY created_at
    LIMIT 1;
    
    -- Get a property owned by the original user
    SELECT id INTO property_to_share
    FROM property_analyses
    WHERE user_id = original_user_id
    LIMIT 1;
    
    -- Share the property if all IDs are found
    IF original_user_id IS NOT NULL AND new_user_id IS NOT NULL AND property_to_share IS NOT NULL THEN
        PERFORM share_property(property_to_share, new_user_id);
        RAISE NOTICE 'Shared property % from user % with user %', 
            property_to_share, original_user_id, new_user_id;
    ELSE
        RAISE NOTICE 'Could not automatically share a property. Missing IDs: original_user_id=%, new_user_id=%, property_to_share=%', 
            original_user_id, new_user_id, property_to_share;
    END IF;
END $$;

-- STEP 6: Verify that the share was created
SELECT 
    ps.id AS share_id,
    ps.property_id,
    ps.user_id AS shared_with_user_id,
    (SELECT email FROM auth.users WHERE id = ps.user_id) AS shared_with_email,
    pa.address AS property_address,
    pa.user_id AS property_owner_id,
    (SELECT email FROM auth.users WHERE id = pa.user_id) AS owner_email,
    ps.created_at
FROM property_shares ps
JOIN property_analyses pa ON ps.property_id = pa.id
ORDER BY ps.created_at DESC
LIMIT 10;

-- STEP 7: Check what properties each user can see
DO $$
DECLARE
    user_record RECORD;
    property_count INTEGER;
BEGIN
    FOR user_record IN 
        SELECT id, email FROM auth.users
    LOOP
        -- Count properties owned by this user
        SELECT COUNT(*) INTO property_count
        FROM property_analyses
        WHERE user_id = user_record.id;
        
        RAISE NOTICE 'User % (%) owns % properties', 
            user_record.email, user_record.id, property_count;
        
        -- Count properties shared with this user
        SELECT COUNT(*) INTO property_count
        FROM property_shares
        WHERE user_id = user_record.id;
        
        RAISE NOTICE 'User % (%) has % properties shared with them', 
            user_record.email, user_record.id, property_count;
    END LOOP;
END $$; 