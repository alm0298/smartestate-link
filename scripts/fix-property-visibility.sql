-- Script to diagnose and fix property visibility for shared properties

-- First, let's check the current policies on property_analyses
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'property_analyses';

-- Check the property_shares table structure and data
SELECT * FROM information_schema.columns 
WHERE table_name = 'property_shares';

-- Check if there are any shares in the property_shares table
SELECT COUNT(*) FROM property_shares;

-- Sample of property shares
SELECT * FROM property_shares LIMIT 10;

-- Let's check if the dashboard query is different from the properties page query
-- This is a diagnostic query to see what properties a specific user can see
-- Replace 'USER_ID_HERE' with the ID of your new user
SELECT 
    p.id, 
    p.address, 
    p.user_id,
    EXISTS (
        SELECT 1 FROM property_shares ps 
        WHERE ps.property_id = p.id 
        AND ps.user_id = 'USER_ID_HERE'
    ) AS is_shared
FROM property_analyses p
WHERE 
    p.user_id = 'USER_ID_HERE' -- Properties owned by the user
    OR 
    EXISTS (
        SELECT 1 FROM property_shares ps 
        WHERE ps.property_id = p.id 
        AND ps.user_id = 'USER_ID_HERE'
    ); -- Properties shared with the user

-- Let's create a function to share a property with a user
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

-- Let's modify the view_shared_properties policy to make it simpler and more reliable
DROP POLICY IF EXISTS "view_shared_properties" ON property_analyses;

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

-- Let's also make sure the property_shares policies are correct
DROP POLICY IF EXISTS "view_all_shares" ON property_shares;

CREATE POLICY "view_all_shares"
ON property_shares
FOR SELECT
TO authenticated
USING (
    -- User can see shares for properties they own
    property_id IN (
        SELECT id 
        FROM property_analyses 
        WHERE user_id = auth.uid()
    )
    OR 
    -- User can see shares for properties shared with them
    user_id = auth.uid()
);

-- Let's create a test share to verify everything works
-- Replace these values with actual IDs from your database
-- 'PROPERTY_ID_HERE' should be a property owned by your original user
-- 'NEW_USER_ID_HERE' should be the ID of your new user
-- UNCOMMENT THIS SECTION TO CREATE A TEST SHARE
/*
SELECT share_property(
    'PROPERTY_ID_HERE'::UUID, 
    'NEW_USER_ID_HERE'::UUID
);
*/

-- Finally, let's check what properties should be visible to the new user
-- Replace 'NEW_USER_ID_HERE' with the ID of your new user
SELECT 
    p.id, 
    p.address, 
    p.user_id AS owner_id,
    CASE 
        WHEN p.user_id = 'NEW_USER_ID_HERE' THEN 'Owned'
        ELSE 'Shared'
    END AS access_type
FROM property_analyses p
WHERE 
    p.user_id = 'NEW_USER_ID_HERE'
    OR 
    p.id IN (
        SELECT property_id 
        FROM property_shares 
        WHERE user_id = 'NEW_USER_ID_HERE'
    ); 