-- Script to share a property between users

-- First, let's create a function to share a property
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

-- List available properties to share
SELECT 
    id AS property_id, 
    address, 
    user_id AS owner_id,
    (SELECT email FROM auth.users WHERE id = user_id) AS owner_email
FROM property_analyses
ORDER BY created_at DESC
LIMIT 10;

-- List available users to share with
SELECT 
    id AS user_id, 
    email
FROM auth.users
ORDER BY created_at DESC;

-- To share a property, uncomment and modify the following line:
-- SELECT share_property('PROPERTY_ID_HERE'::UUID, 'USER_ID_TO_SHARE_WITH'::UUID);

-- After sharing, check if the share was created
-- SELECT * FROM property_shares ORDER BY created_at DESC LIMIT 10; 