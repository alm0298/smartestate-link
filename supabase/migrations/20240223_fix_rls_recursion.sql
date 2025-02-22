-- Disable RLS before modifying policies
ALTER TABLE property_analyses DISABLE ROW LEVEL SECURITY;

-- Drop potentially recursive policies
DROP POLICY IF EXISTS "Users can view own properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can insert own properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can update own properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can delete own properties" ON property_analyses;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON property_analyses;
DROP POLICY IF EXISTS "Enable insert access for users based on user_id" ON property_analyses;
DROP POLICY IF EXISTS "Enable update access for users based on user_id" ON property_analyses;
DROP POLICY IF EXISTS "Enable delete access for users based on user_id" ON property_analyses;

-- Re-enable RLS
ALTER TABLE property_analyses ENABLE ROW LEVEL SECURITY;

-- Create new, non-recursive policies using current_setting
CREATE POLICY "property_analyses_select_policy" 
  ON property_analyses 
  FOR SELECT 
  TO authenticated 
  USING (user_id = current_setting('jwt.claims.sub', true)::uuid);

CREATE POLICY "property_analyses_insert_policy" 
  ON property_analyses 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = current_setting('jwt.claims.sub', true)::uuid);

CREATE POLICY "property_analyses_update_policy" 
  ON property_analyses 
  FOR UPDATE 
  TO authenticated 
  USING (user_id = current_setting('jwt.claims.sub', true)::uuid);

CREATE POLICY "property_analyses_delete_policy" 
  ON property_analyses 
  FOR DELETE 
  TO authenticated 
  USING (user_id = current_setting('jwt.claims.sub', true)::uuid); 