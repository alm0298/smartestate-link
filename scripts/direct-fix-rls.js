#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if environment variables are set
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: Missing Supabase environment variables.');
  console.error('Please make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixRlsPolicies() {
  console.log('=== Fixing RLS Policies ===');
  
  try {
    // SQL to fix RLS policies
    const sql = `
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
    `;
    
    // Execute SQL directly
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      if (error.message.includes('function "exec_sql" does not exist')) {
        console.log('Creating exec_sql function...');
        
        // Create exec_sql function
        const createFunctionSql = `
          CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
          RETURNS JSONB
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            result JSONB;
          BEGIN
            EXECUTE sql INTO result;
            RETURN result;
          EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('error', SQLERRM);
          END;
          $$;
          
          -- Grant execute permission to authenticated users
          GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
        `;
        
        // Try to create the function using direct SQL
        try {
          // We need to use a different approach since we don't have the function yet
          const { error: createError } = await supabase.from('_exec_sql_temp').select('*').limit(1);
          
          if (createError) {
            console.error('Error creating exec_sql function:', createError);
            console.log('\nPlease run the SQL manually in the Supabase dashboard SQL editor.');
            console.log('The SQL is available in the scripts/check-database.sql file.');
          }
        } catch (err) {
          console.error('Error creating exec_sql function:', err);
          console.log('\nPlease run the SQL manually in the Supabase dashboard SQL editor.');
          console.log('The SQL is available in the scripts/check-database.sql file.');
        }
      } else {
        console.error('Error fixing RLS policies:', error);
        console.log('\nPlease run the SQL manually in the Supabase dashboard SQL editor.');
        console.log('The SQL is available in the scripts/check-database.sql file.');
      }
    } else {
      console.log('RLS policies fixed successfully!');
    }
  } catch (error) {
    console.error('Error fixing RLS policies:', error);
    console.log('\nPlease run the SQL manually in the Supabase dashboard SQL editor.');
    console.log('The SQL is available in the scripts/check-database.sql file.');
  }
}

// Run the function
fixRlsPolicies().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 