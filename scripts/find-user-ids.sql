-- Script to find user IDs in the Supabase database

-- Get the current authenticated user's ID
SELECT auth.uid() AS current_user_id;

-- List all users in the database
SELECT 
    id AS user_id, 
    email, 
    created_at,
    last_sign_in_at,
    CASE 
        WHEN id = auth.uid() THEN 'Current User'
        ELSE 'Other User'
    END AS status
FROM auth.users
ORDER BY created_at DESC;

-- Count properties owned by each user
SELECT 
    user_id, 
    COUNT(*) AS property_count,
    (SELECT email FROM auth.users WHERE id = user_id) AS user_email
FROM property_analyses
GROUP BY user_id
ORDER BY property_count DESC;

-- Check if there are any property shares
SELECT 
    ps.user_id AS shared_with_user_id,
    (SELECT email FROM auth.users WHERE id = ps.user_id) AS shared_with_email,
    pa.user_id AS property_owner_id,
    (SELECT email FROM auth.users WHERE id = pa.user_id) AS owner_email,
    pa.address AS property_address
FROM property_shares ps
JOIN property_analyses pa ON ps.property_id = pa.id
ORDER BY ps.created_at DESC
LIMIT 10; 