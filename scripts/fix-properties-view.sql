-- COMPREHENSIVE FIX FOR PROPERTY VISIBILITY
-- This script focuses on fixing property visibility for shared properties

-- STEP 1: Check current RLS status
SELECT 
    relname AS table_name,
    relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'property_analyses';

-- STEP 2: Check all current policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'property_analyses';

-- STEP 3: Fix RLS policies - start by dropping problematic ones
DROP POLICY IF EXISTS "view_shared_properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view own or shared properties" ON property_analyses;

-- STEP 4: Create a new simpler policy for shared properties
CREATE POLICY "view_shared_properties"
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

-- STEP 5: Check property shares table
\d property_shares

-- STEP 6: Check if there are any actual shared properties
SELECT COUNT(*) FROM property_shares;

-- STEP 7: List users to find out user IDs
SELECT id, email FROM auth.users ORDER BY created_at;

-- STEP 8: List properties
SELECT id, address, user_id FROM property_analyses ORDER BY created_at DESC LIMIT 10;

-- STEP 9: Create a test share between users
-- Replace these values with actual user IDs and property IDs from your database
DO $$
DECLARE
    -- Get the first user (typically the original/admin user)
    first_user_id UUID := (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);
    
    -- Get another user (the new user that can't see properties)
    second_user_id UUID := (SELECT id FROM auth.users WHERE id != first_user_id ORDER BY created_at LIMIT 1);
    
    -- Get a property owned by the first user
    property_id UUID := (SELECT id FROM property_analyses WHERE user_id = first_user_id LIMIT 1);
BEGIN
    -- Log our findings
    RAISE NOTICE 'First user ID: %', first_user_id;
    RAISE NOTICE 'Second user ID: %', second_user_id;
    RAISE NOTICE 'Property ID: %', property_id;
    
    -- Create a share if all values are found
    IF first_user_id IS NOT NULL AND second_user_id IS NOT NULL AND property_id IS NOT NULL THEN
        -- Delete any existing shares for this property/user combination
        DELETE FROM property_shares WHERE property_id = property_id AND user_id = second_user_id;
        
        -- Insert the new share
        INSERT INTO property_shares (property_id, user_id)
        VALUES (property_id, second_user_id);
        
        RAISE NOTICE 'Created share for property % with user %', property_id, second_user_id;
    ELSE
        RAISE NOTICE 'Could not create share - missing data. First user: %, Second user: %, Property: %', 
            first_user_id, second_user_id, property_id;
    END IF;
END $$;

-- STEP 10: Verify the share was created
SELECT * FROM property_shares ORDER BY created_at DESC LIMIT 5;

-- STEP 11: Test what the second user should see
-- Replace second_user_id with the actual ID from step 9
DO $$
DECLARE
    second_user_id UUID := (SELECT id FROM auth.users ORDER BY created_at OFFSET 1 LIMIT 1);
    owned_count INTEGER;
    shared_count INTEGER;
BEGIN
    -- Count properties owned by this user
    SELECT COUNT(*) INTO owned_count
    FROM property_analyses
    WHERE user_id = second_user_id;
    
    -- Count properties shared with this user
    SELECT COUNT(*) INTO shared_count
    FROM property_shares
    WHERE user_id = second_user_id;
    
    RAISE NOTICE 'Second user (ID: %) owns % properties and has % properties shared with them', 
        second_user_id, owned_count, shared_count;
END $$; 