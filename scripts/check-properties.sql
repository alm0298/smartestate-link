-- Check if properties exist in the database
SELECT COUNT(*) AS total_properties FROM property_analyses;

-- Show a sample of properties
SELECT id, user_id, address, created_at 
FROM property_analyses 
ORDER BY created_at DESC
LIMIT 10;

-- Check if property_shares exist
SELECT COUNT(*) AS total_shares FROM property_shares;

-- Show a sample of property shares
SELECT id, property_id, user_id, created_at 
FROM property_shares 
ORDER BY created_at DESC
LIMIT 10;

-- Check current RLS policies for property_analyses
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'property_analyses';

-- Check if RLS is enabled on property_analyses
SELECT 
    relname AS table_name,
    relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'property_analyses';

-- Check if the property_shares table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'property_shares'
) AS property_shares_exists; 