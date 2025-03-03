-- This script tests if the RLS policies are working correctly

-- First, let's get your current user ID
SELECT auth.uid() AS current_user_id;

-- Create a test user if needed (uncomment if you want to create a test user)
/*
INSERT INTO auth.users (id, email)
VALUES 
  (gen_random_uuid(), 'test1@example.com'),
  (gen_random_uuid(), 'test2@example.com')
RETURNING id, email;
*/

-- Let's see all users in the system
SELECT id, email FROM auth.users;

-- Create a test property for the current user
INSERT INTO property_analyses (
  address, 
  price, 
  monthly_rent, 
  estimated_expenses, 
  user_id
)
VALUES (
  'Test Property ' || now()::text, 
  500000, 
  2500, 
  1000, 
  auth.uid()
)
RETURNING id, address, user_id;

-- Now let's check if we can see our own property
SELECT id, address, user_id 
FROM property_analyses 
WHERE user_id = auth.uid();

-- Let's try to share this property with another user
-- First, get a user ID that is not the current user
WITH other_user AS (
  SELECT id FROM auth.users WHERE id != auth.uid() LIMIT 1
)
INSERT INTO property_shares (property_id, user_id)
SELECT 
  (SELECT id FROM property_analyses WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1),
  id
FROM other_user
RETURNING property_id, user_id;

-- Check if the share was created
SELECT * FROM property_shares ORDER BY created_at DESC LIMIT 5;

-- Now, to test if another user can see the shared property,
-- you would need to sign in as that user in your application.

-- Clean up (uncomment if you want to delete the test data)
/*
DELETE FROM property_shares 
WHERE property_id IN (SELECT id FROM property_analyses WHERE address LIKE 'Test Property%');

DELETE FROM property_analyses 
WHERE address LIKE 'Test Property%';
*/ 