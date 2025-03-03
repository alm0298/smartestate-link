// Test script to check Supabase connection and fetch properties
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error('Error: Supabase environment variables are not set correctly.');
  console.log('Please update your .env file with the following variables:');
  console.log('VITE_SUPABASE_URL=your_supabase_url');
  console.log('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key');
  process.exit(1);
}

// Create Supabase clients
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Function to test anonymous connection
async function testAnonConnection() {
  console.log('Testing anonymous connection...');
  try {
    const { data, error } = await supabaseAnon.from('property_analyses').select('count(*)');
    
    if (error) {
      console.error('Error with anonymous connection:', error);
      return false;
    }
    
    console.log('Anonymous connection successful!');
    console.log('Count result:', data);
    return true;
  } catch (err) {
    console.error('Exception with anonymous connection:', err);
    return false;
  }
}

// Function to test admin connection
async function testAdminConnection() {
  console.log('\nTesting admin connection...');
  try {
    const { data, error } = await supabaseAdmin.from('property_analyses').select('count(*)');
    
    if (error) {
      console.error('Error with admin connection:', error);
      return false;
    }
    
    console.log('Admin connection successful!');
    console.log('Count result:', data);
    return true;
  } catch (err) {
    console.error('Exception with admin connection:', err);
    return false;
  }
}

// Function to check RLS policies
async function checkRLSPolicies() {
  console.log('\nChecking RLS policies...');
  try {
    const { data, error } = await supabaseAdmin.rpc('get_policies', { table_name: 'property_analyses' });
    
    if (error) {
      console.error('Error checking RLS policies:', error);
      console.log('Creating custom function to check policies...');
      
      // Create a function to get policies if it doesn't exist
      const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION get_policies(table_name text)
          RETURNS TABLE (
            schemaname text,
            tablename text,
            policyname text,
            roles text[],
            cmd text,
            qual text,
            with_check text
          )
          LANGUAGE SQL
          SECURITY DEFINER
          AS $$
            SELECT 
              schemaname::text,
              tablename::text,
              policyname::text,
              roles::text[],
              cmd::text,
              qual::text,
              with_check::text
            FROM pg_policies
            WHERE tablename = table_name;
          $$;
        `
      });
      
      if (createError) {
        console.error('Error creating policy check function:', createError);
        
        // Try direct SQL query
        const { data: directData, error: directError } = await supabaseAdmin.from('pg_policies').select('*').eq('tablename', 'property_analyses');
        
        if (directError) {
          console.error('Error with direct policy query:', directError);
          return false;
        }
        
        console.log('Policies (direct query):', directData);
        return true;
      }
      
      // Try again with the new function
      const { data: retryData, error: retryError } = await supabaseAdmin.rpc('get_policies', { table_name: 'property_analyses' });
      
      if (retryError) {
        console.error('Error checking RLS policies after creating function:', retryError);
        return false;
      }
      
      console.log('Policies:', retryData);
      return true;
    }
    
    console.log('Policies:', data);
    return true;
  } catch (err) {
    console.error('Exception checking RLS policies:', err);
    return false;
  }
}

// Function to fetch properties with user ID
async function fetchPropertiesWithUserId(userId) {
  console.log(`\nFetching properties for user ID: ${userId}...`);
  try {
    // Try with admin client first
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('property_analyses')
      .select('id, address, user_id')
      .eq('user_id', userId);
    
    if (adminError) {
      console.error('Error fetching properties with admin client:', adminError);
    } else {
      console.log('Properties fetched with admin client:', adminData);
    }
    
    // Try with anon client
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('property_analyses')
      .select('id, address, user_id')
      .eq('user_id', userId);
    
    if (anonError) {
      console.error('Error fetching properties with anon client:', anonError);
      return false;
    }
    
    console.log('Properties fetched with anon client:', anonData);
    return true;
  } catch (err) {
    console.error('Exception fetching properties:', err);
    return false;
  }
}

// Function to check property_shares table
async function checkPropertyShares() {
  console.log('\nChecking property_shares table...');
  try {
    const { data, error } = await supabaseAdmin.from('property_shares').select('count(*)');
    
    if (error) {
      console.error('Error checking property_shares:', error);
      return false;
    }
    
    console.log('Property shares count:', data);
    
    // Get a sample of shares
    const { data: sharesData, error: sharesError } = await supabaseAdmin
      .from('property_shares')
      .select('id, property_id, user_id, created_at')
      .limit(5);
    
    if (sharesError) {
      console.error('Error fetching property shares sample:', sharesError);
      return false;
    }
    
    console.log('Property shares sample:', sharesData);
    return true;
  } catch (err) {
    console.error('Exception checking property shares:', err);
    return false;
  }
}

// Main function
async function main() {
  console.log('Supabase Connection Test');
  console.log('=======================');
  console.log(`Supabase URL: ${supabaseUrl}`);
  
  // Test connections
  const anonConnected = await testAnonConnection();
  const adminConnected = await testAdminConnection();
  
  if (!anonConnected && !adminConnected) {
    console.error('\nBoth connections failed. Please check your Supabase credentials.');
    process.exit(1);
  }
  
  // Check RLS policies
  await checkRLSPolicies();
  
  // Check property_shares table
  await checkPropertyShares();
  
  // Fetch properties for a specific user ID
  // Replace with an actual user ID from your database
  const userId = '2cf9bdbb-6395-4599-abff-d1c12a3fa0e9'; // This is the user ID from your error message
  await fetchPropertiesWithUserId(userId);
  
  console.log('\nTest completed!');
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 