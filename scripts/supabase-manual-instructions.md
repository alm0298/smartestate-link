# Manually Applying RLS Policies in Supabase

Since you don't have access to your Supabase service role key, you'll need to apply the Row Level Security (RLS) policies manually through the Supabase dashboard. Follow these steps:

## Step 1: Access the Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in with your account
3. Select your project (the one with URL: `https://lwsesoxppmoerwwvvdar.supabase.co`)

## Step 2: Open the SQL Editor

1. In the left sidebar, click on **SQL Editor**
2. Click on **New Query** to create a new SQL query

## Step 3: Run the RLS Policy SQL

1. Copy the entire SQL script from the file `scripts/rls-policies.sql`
2. Paste it into the SQL Editor
3. Click the **Run** button to execute the SQL

The SQL script will:
- Drop any existing policies for viewing properties
- Create a new policy that allows users to view both their own properties AND properties shared with them
- Ensure that other policies (insert, update, delete) are correctly set to restrict actions to the user's own properties
- Display a list of all policies on the `property_analyses` table to verify the changes

## Step 4: Verify the Changes

After running the SQL, you should see a list of policies at the bottom of the results. Make sure you see the following policies:
- "Users can view own or shared properties" (for SELECT)
- "Users can insert own properties" (for INSERT)
- "Users can update own properties" (for UPDATE)
- "Users can delete own properties" (for DELETE)

## Step 5: Test the Application

1. Go back to your application
2. Refresh the page
3. Navigate to the Properties page
4. You should now see both your own properties and properties that have been shared with you

## Troubleshooting

If you're still not seeing shared properties:
1. Make sure the `property_shares` table contains entries linking properties to your user ID
2. Check that the RLS policies were successfully applied (no errors in the SQL execution)
3. Verify that your application is correctly fetching properties without filtering by user ID

## Additional Information

The key change in the RLS policy is the addition of this condition:
```sql
EXISTS (
  SELECT 1 FROM property_shares
  WHERE property_shares.property_id = property_analyses.id
  AND property_shares.user_id = auth.uid()
)
```

This allows users to view properties that have been shared with them through the `property_shares` table. 