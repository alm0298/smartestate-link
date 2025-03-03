#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Hardcoded Supabase URL from your project
const supabaseUrl = 'https://lwsesoxppmoerwwvvdar.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
  console.log('Please run this script with the service role key:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node scripts/check-rls.js');
  process.exit(1);
}

// Create Supabase admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to prompt for user input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function checkAndFixRLS() {
  try {
    console.log('=== Checking and Fixing RLS Policies ===\n');
    
    // Step 1: Create a SQL function to check RLS policies
    console.log('Creating SQL function to check RLS policies...');
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION check_rls_policies()
      RETURNS TABLE (
        schema_name text,
        table_name text,
        policy_name text,
        roles text[],
        cmd text,
        qual text,
        with_check text
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          n.nspname::text AS schema_name,
          c.relname::text AS table_name,
          p.polname::text AS policy_name,
          p.polroles::text[] AS roles,
          CASE p.polcmd
            WHEN 'r' THEN 'SELECT'
            WHEN 'a' THEN 'INSERT'
            WHEN 'w' THEN 'UPDATE'
            WHEN 'd' THEN 'DELETE'
            WHEN '*' THEN 'ALL'
          END AS cmd,
          pg_catalog.pg_get_expr(p.polqual, p.polrelid)::text AS qual,
          pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid)::text AS with_check
        FROM
          pg_catalog.pg_policy p
        JOIN
          pg_catalog.pg_class c ON c.oid = p.polrelid
        JOIN
          pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE
          c.relname = 'property_analyses'
        ORDER BY
          schema_name, table_name, policy_name;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Execute the SQL to create the function
    const { error: createFunctionError } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
    
    if (createFunctionError) {
      console.error('Error creating function:', createFunctionError.message);
      
      // If the function doesn't exist, we'll try a different approach
      console.log('\nTrying a different approach to check RLS policies...');
      
      // Step 2: Check if the "Users can view own or shared properties" policy exists
      console.log('\nChecking if the correct RLS policy exists for property_analyses...');
      
      // Create the policy if it doesn't exist
      console.log('\nCreating/updating the RLS policy for property_analyses...');
      
      const updateRLSSQL = `
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
      `;
      
      const { error: updateRLSError } = await supabase.rpc('exec_sql', { sql: updateRLSSQL });
      
      if (updateRLSError) {
        console.error('Error updating RLS policy:', updateRLSError.message);
        
        // If the exec_sql function doesn't exist, we'll need to create it
        console.log('\nCreating exec_sql function...');
        
        const createExecSQLFunctionSQL = `
          CREATE OR REPLACE FUNCTION exec_sql(sql text)
          RETURNS void AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$ LANGUAGE plpgsql;
        `;
        
        // We can't execute this directly, so we'll need to provide instructions
        console.log('\nPlease execute the following SQL in your Supabase SQL Editor:');
        console.log(createExecSQLFunctionSQL);
        console.log('\nThen execute:');
        console.log(updateRLSSQL);
        
        const proceed = await prompt('\nDid you execute the SQL? (y/n): ');
        
        if (proceed.toLowerCase() !== 'y') {
          console.log('Exiting script. Please execute the SQL and run the script again.');
          process.exit(0);
        }
      } else {
        console.log('RLS policy updated successfully!');
      }
    } else {
      console.log('SQL function created successfully!');
      
      // Step 3: Check the RLS policies
      console.log('\nChecking RLS policies for property_analyses...');
      
      const { data: policies, error: policiesError } = await supabase.rpc('check_rls_policies');
      
      if (policiesError) {
        console.error('Error checking policies:', policiesError.message);
      } else {
        console.log('Current RLS policies:');
        console.log(policies);
        
        // Check if the correct policy exists
        const hasCorrectPolicy = policies.some(p => 
          p.policy_name === 'Users can view own or shared properties' && 
          p.cmd === 'SELECT' &&
          p.qual.includes('property_shares')
        );
        
        if (!hasCorrectPolicy) {
          console.log('\nThe correct RLS policy does not exist. Creating it...');
          
          const updateRLSSQL = `
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
          `;
          
          const { error: updateRLSError } = await supabase.rpc('exec_sql', { sql: updateRLSSQL });
          
          if (updateRLSError) {
            console.error('Error updating RLS policy:', updateRLSError.message);
          } else {
            console.log('RLS policy updated successfully!');
          }
        } else {
          console.log('\nThe correct RLS policy already exists.');
        }
      }
    }
    
    console.log('\nRLS policy check and fix complete!');
    
  } catch (err) {
    console.error('Unexpected error:', err.message);
  } finally {
    rl.close();
  }
}

checkAndFixRLS(); 