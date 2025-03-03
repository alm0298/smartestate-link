#!/usr/bin/env node

// Import required modules
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import readline from 'readline';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize dotenv with the path to the .env file
dotenv.config({ path: resolve(__dirname, '../.env') });

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt function for user input
const prompt = (question) => new Promise((resolve) => {
  rl.question(question, (answer) => resolve(answer));
});

// SQL to update RLS policies
const sql = `
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
`;

async function applyRlsPolicies() {
  console.log('Checking environment variables...');
  
  // Get Supabase URL and service role key
  // Use the hardcoded URL from client.ts if the environment variable is not set
  let supabaseUrl = process.env.VITE_SUPABASE_URL;
  let supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Check if the values are placeholders or not set
  if (!supabaseUrl || supabaseUrl === 'your_supabase_url') {
    // Use the hardcoded URL from client.ts
    supabaseUrl = 'https://lwsesoxppmoerwwvvdar.supabase.co';
    console.log('Using hardcoded Supabase URL:', supabaseUrl);
  }
  
  if (!supabaseServiceRoleKey || supabaseServiceRoleKey === 'your_supabase_service_role_key') {
    console.log('Service role key is not properly set in the .env file.');
    console.log('Please provide the actual value:');
    supabaseServiceRoleKey = await prompt('Enter your Supabase service role key: ');
  }
  
  console.log('Creating Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  console.log('Applying RLS policies to property_analyses table...');
  
  try {
    // Execute the SQL using the rpc function
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error applying RLS policies:', error.message);
      
      // If the exec_sql function doesn't exist, try direct SQL execution
      console.log('Attempting direct SQL execution...');
      
      try {
        // Try to execute the SQL directly using the REST API
        const { error: sqlError } = await supabase.from('rpc').select('*').eq('name', 'exec_sql');
        
        if (sqlError) {
          console.error('Direct SQL execution failed:', sqlError.message);
          console.log('\nYou may need to run these SQL commands directly in the Supabase dashboard:');
          console.log(sql);
          console.log('\nInstructions:');
          console.log('1. Go to https://supabase.com/dashboard and select your project');
          console.log('2. Click on "SQL Editor" in the left sidebar');
          console.log('3. Create a new query, paste the SQL above, and click "Run"');
        }
      } catch (err) {
        console.error('Error executing SQL directly:', err.message);
      }
      
      rl.close();
      process.exit(1);
    }
    
    console.log('RLS policies successfully applied!');
    console.log('Users can now view their own properties and properties shared with them.');
    rl.close();
  } catch (err) {
    console.error('Unexpected error:', err.message);
    rl.close();
    process.exit(1);
  }
}

// Execute the function
applyRlsPolicies(); 