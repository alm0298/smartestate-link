-- Replace 'YOUR_USER_ID' with your actual user ID
-- You can find your user ID by running: SELECT auth.uid();

-- Check your user ID
SELECT auth.uid() AS your_user_id;

-- Check properties owned by you
SELECT 
    id, 
    address, 
    created_at 
FROM property_analyses 
WHERE user_id = auth.uid();

-- Check properties shared with you
SELECT 
    p.id, 
    p.address, 
    p.user_id AS owner_id,
    ps.created_at AS shared_at
FROM property_analyses p
JOIN property_shares ps ON p.id = ps.property_id
WHERE ps.user_id = auth.uid()
AND p.user_id != auth.uid();

-- Check if you have shared any properties with others
SELECT 
    p.id, 
    p.address, 
    ps.user_id AS shared_with_user,
    ps.created_at AS shared_at
FROM property_analyses p
JOIN property_shares ps ON p.id = ps.property_id
WHERE p.user_id = auth.uid();

-- Check if the property_shares table has any records
SELECT COUNT(*) FROM property_shares;

-- Insert a test share (only run this if you want to test sharing)
-- This will share the first property you own with user ID 'TARGET_USER_ID'
-- Replace 'TARGET_USER_ID' with the user ID you want to share with
/*
INSERT INTO property_shares (property_id, user_id)
SELECT 
    id, 
    'TARGET_USER_ID'::uuid
FROM property_analyses
WHERE user_id = auth.uid()
LIMIT 1;
*/ 