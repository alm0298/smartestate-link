-- Create the property-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Update the storage.objects policies to include owner
ALTER TABLE storage.objects
ADD COLUMN IF NOT EXISTS owner text;

-- Update the storage policy to set owner on insert
CREATE OR REPLACE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'property-images' 
    AND (owner IS NULL OR owner = auth.uid()::text)
);

-- Allow users to update their own images
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'property-images' 
    AND owner = auth.uid()::text
);

-- Ensure public can download images
CREATE OR REPLACE POLICY "Images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-images');

-- Users can only delete their own images
CREATE OR REPLACE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'property-images' 
    AND owner = auth.uid()::text
); 