-- Enable RLS
ALTER TABLE property_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own properties"
ON property_analyses FOR SELECT
TO authenticated
USING (user_id = current_setting('jwt.claims.sub', true)::uuid);

CREATE POLICY "Users can insert their own properties"
ON property_analyses FOR INSERT
TO authenticated
WITH CHECK (user_id = current_setting('jwt.claims.sub', true)::uuid);

CREATE POLICY "Users can update their own properties"
ON property_analyses FOR UPDATE
TO authenticated
USING (user_id = current_setting('jwt.claims.sub', true)::uuid);

CREATE POLICY "Users can delete their own properties"
ON property_analyses FOR DELETE
TO authenticated
USING (user_id = current_setting('jwt.claims.sub', true)::uuid);

-- Enable RLS for storage
CREATE POLICY "Images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-images' AND (auth.uid())::text = owner); 