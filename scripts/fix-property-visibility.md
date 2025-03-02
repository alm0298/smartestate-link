# Fixing Property Visibility Issue

## The Problem

Properties that have been shared with you are not appearing in the Properties page. This is happening because:

1. The Row Level Security (RLS) policies in Supabase are only allowing users to see properties they own.
2. Even though entries exist in the `property_shares` table, the RLS policy doesn't check this table.

## The Solution

We need to update the RLS policies to allow users to view properties that have been shared with them. The key changes are:

1. Create a new RLS policy that allows users to view properties if:
   - They own the property (user_id = auth.uid())
   - OR the property has been shared with them via the property_shares table

## What We've Done

1. Created a SQL script (`scripts/rls-policies.sql`) that contains the necessary SQL commands to update the RLS policies.
2. Created detailed instructions (`scripts/supabase-manual-instructions.md`) on how to apply these changes through the Supabase dashboard.
3. Verified that the frontend code in `src/pages/Properties.tsx` is already set up correctly to display shared properties once the RLS policies are updated.

## What You Need to Do

1. Follow the instructions in `scripts/supabase-manual-instructions.md` to update the RLS policies in your Supabase project.
2. After updating the policies, refresh your application and navigate to the Properties page.
3. You should now see both your own properties and properties that have been shared with you.

## Technical Details

### The Updated RLS Policy

```sql
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
```

### Frontend Query

The frontend query in `src/pages/Properties.tsx` has already been updated to remove the explicit user_id filter, allowing the RLS policies to handle access control:

```typescript
const { data, error } = await supabase
  .from("property_analyses")
  .select(`
    id,
    address,
    price,
    roi,
    images,
    details,
    monthly_rent,
    estimated_expenses,
    pros,
    cons,
    summary,
    score
  `)
  .order('created_at', { ascending: false });
```

## Troubleshooting

If you're still not seeing shared properties after updating the RLS policies:

1. Make sure the `property_shares` table contains entries linking properties to your user ID.
2. Check that the RLS policies were successfully applied (no errors in the SQL execution).
3. Clear your browser cache or try in an incognito window.
4. Check the browser console for any errors. 