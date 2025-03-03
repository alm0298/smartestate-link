# Supabase SQL Instructions

Follow these steps to fix the Row Level Security (RLS) policies for your Supabase project:

1. Go to your Supabase dashboard at https://app.supabase.com
2. Select your project (the one with URL https://lwsesoxppmoerwwvvdar.supabase.co)
3. Click on "SQL Editor" in the left sidebar
4. Create a new query by clicking the "+" button
5. Paste the following SQL code:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view own or shared properties" ON property_analyses;

-- Create new policy to allow viewing shared properties
CREATE POLICY "Users can view own or shared properties"
ON property_analyses
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM property_shares
    WHERE property_shares.property_id = property_analyses.id
    AND property_shares.user_id = auth.uid()
  )
);

-- Make sure other policies exist for insert, update, delete
DROP POLICY IF EXISTS "Users can insert own properties" ON property_analyses;
CREATE POLICY "Users can insert own properties"
ON property_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own properties" ON property_analyses;
CREATE POLICY "Users can update own properties"
ON property_analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own properties" ON property_analyses;
CREATE POLICY "Users can delete own properties"
ON property_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

6. Click "Run" to execute the SQL code
7. After the SQL has been executed, refresh your application and try to view the properties again

## Explanation

This SQL script does the following:

1. Drops any existing RLS policies for viewing properties
2. Creates a new policy that allows users to view properties they own OR properties that have been shared with them
3. Ensures that the other policies (insert, update, delete) are correctly set up to only allow users to modify their own properties

The key change is in the "Users can view own or shared properties" policy, which now includes a check for shared properties in the `property_shares` table. 