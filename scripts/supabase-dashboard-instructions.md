# Updating RLS Policies in Supabase Dashboard

Follow these steps to update your Row Level Security (RLS) policies for the `property_analyses` table:

## Step 1: Access the Supabase Dashboard

1. Go to https://app.supabase.com
2. Sign in to your account
3. Select your project

## Step 2: Navigate to the SQL Editor

1. In the left sidebar, click on "SQL Editor"
2. Click "New Query" to create a new SQL query

## Step 3: Copy and Paste the Following SQL

```sql
-- First, drop all existing policies
DROP POLICY IF EXISTS "Agents can see all properties they created" ON property_analyses;
DROP POLICY IF EXISTS "Allow public insert access" ON property_analyses;
DROP POLICY IF EXISTS "Allow public read access" ON property_analyses;
DROP POLICY IF EXISTS "Allow select for owners" ON property_analyses;
DROP POLICY IF EXISTS "Clients can see properties shared with them" ON property_analyses;
DROP POLICY IF EXISTS "Enable delete for property owners" ON property_analyses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON property_analyses;
DROP POLICY IF EXISTS "Enable update for property owners" ON property_analyses;
DROP POLICY IF EXISTS "Users can create their own analyses" ON property_analyses;
DROP POLICY IF EXISTS "Users can delete own properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can delete their own analyses" ON property_analyses;
DROP POLICY IF EXISTS "Users can insert own properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can update own properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON property_analyses;
DROP POLICY IF EXISTS "Users can view own or shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view their own analyses" ON property_analyses;
DROP POLICY IF EXISTS "property_analyses_delete_policy" ON property_analyses;
DROP POLICY IF EXISTS "property_analyses_insert_policy" ON property_analyses;
DROP POLICY IF EXISTS "property_analyses_select_policy" ON property_analyses;
DROP POLICY IF EXISTS "property_analyses_update_policy" ON property_analyses;

-- Now create just the policies we need
-- 1. Policy for viewing properties (own or shared)
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

-- 2. Policy for inserting properties (only own)
CREATE POLICY "Users can insert own properties"
ON property_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Policy for updating properties (only own)
CREATE POLICY "Users can update own properties"
ON property_analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Policy for deleting properties (only own)
CREATE POLICY "Users can delete own properties"
ON property_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

## Step 4: Execute the SQL

1. Click the "Run" button to execute the SQL
2. You should see a success message indicating that the commands were executed successfully

## Step 5: Verify the Policies

1. In the left sidebar, click on "Table Editor"
2. Find and select the `property_analyses` table
3. Click on "Policies" in the top navigation
4. You should see the following policies:
   - "Users can view own or shared properties" (for SELECT)
   - "Users can insert own properties" (for INSERT)
   - "Users can update own properties" (for UPDATE)
   - "Users can delete own properties" (for DELETE)

## What This Does

This SQL script:

1. Removes all existing RLS policies for the `property_analyses` table to avoid conflicts
2. Creates a new policy that allows users to view:
   - Properties they own (where `user_id = auth.uid()`)
   - Properties shared with them (via the `property_shares` table)
3. Creates policies that allow users to insert, update, and delete only their own properties

After applying these changes, users should be able to see both their own properties and properties that have been shared with them. 