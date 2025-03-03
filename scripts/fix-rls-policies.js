#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if environment variables are set
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: Missing Supabase environment variables.');
  console.error('Please make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.');
  console.error('You can run scripts/setup-supabase-env.js to set up your environment variables.');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkDatabase() {
  console.log('\n=== Checking Database ===\n');
  
  try {
    // Check property_analyses table
    const { data: properties, error: propertiesError } = await supabase
      .from('property_analyses')
      .select('id, user_id, address')
      .limit(10);
    
    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
    } else {
      console.log(`Found ${properties.length} properties:`);
      properties.forEach(prop => {
        console.log(`- ID: ${prop.id}, User: ${prop.user_id}, Address: ${prop.address}`);
      });
    }
    
    // Check property_shares table
    const { data: shares, error: sharesError } = await supabase
      .from('property_shares')
      .select('id, property_id, user_id')
      .limit(10);
    
    if (sharesError) {
      console.error('Error fetching property shares:', sharesError);
    } else {
      console.log(`\nFound ${shares.length} property shares:`);
      shares.forEach(share => {
        console.log(`- ID: ${share.id}, Property: ${share.property_id}, Shared with User: ${share.user_id}`);
      });
    }
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

async function checkRlsPolicies() {
  console.log('\n=== Checking RLS Policies ===\n');
  
  try {
    // Execute SQL to get RLS policies
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT * FROM pg_policies WHERE tablename = 'property_analyses'"
    });
    
    if (error) {
      console.error('Error checking RLS policies:', error);
      console.log('The exec_sql function might not exist. Creating it...');
      
      // Create exec_sql function if it doesn't exist
      const { error: createFunctionError } = await supabase.rpc('exec_sql', {
        sql: `
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
        `
      });
      
      if (createFunctionError) {
        console.error('Error creating exec_sql function:', createFunctionError);
        console.log('\nPlease run the following SQL in the Supabase dashboard SQL editor:');
        console.log(`
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
        `);
      } else {
        console.log('exec_sql function created successfully.');
        // Try again to get RLS policies
        const { data: retryData, error: retryError } = await supabase.rpc('exec_sql', {
          sql: "SELECT * FROM pg_policies WHERE tablename = 'property_analyses'"
        });
        
        if (retryError) {
          console.error('Error checking RLS policies after creating function:', retryError);
        } else {
          console.log('RLS Policies:', retryData);
        }
      }
    } else {
      console.log('RLS Policies:', data);
    }
  } catch (error) {
    console.error('Error checking RLS policies:', error);
  }
}

async function fixRlsPolicies() {
  console.log('\n=== Fixing RLS Policies ===\n');
  
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
    
    // Execute SQL to fix RLS policies
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error fixing RLS policies:', error);
      console.log('\nPlease run the SQL manually in the Supabase dashboard SQL editor.');
      console.log('The SQL is available in the scripts/check-database.sql file.');
    } else {
      console.log('RLS policies fixed successfully!');
    }
  } catch (error) {
    console.error('Error fixing RLS policies:', error);
  }
}

async function main() {
  console.log('=== Supabase Database and RLS Policy Check ===');
  console.log('This script will check your database and RLS policies, and fix them if needed.');
  
  await checkDatabase();
  await checkRlsPolicies();
  
  // Ask if user wants to fix RLS policies
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('\nDo you want to fix RLS policies? (y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      await fixRlsPolicies();
    } else {
      console.log('Skipping RLS policy fix.');
    }
    
    console.log('\nDone!');
    rl.close();
  });
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 