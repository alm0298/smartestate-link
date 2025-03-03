#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

console.log('=== Supabase Environment Check ===\n');

// Check if .env file exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(process.cwd(), '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.log('Please create a .env file in the root directory with your Supabase credentials.');
  console.log('You can run scripts/setup-supabase-env.js to set up your environment variables.');
  process.exit(1);
}

// Check if environment variables are set
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Checking environment variables:');

// Check VITE_SUPABASE_URL
if (!supabaseUrl) {
  console.log('❌ VITE_SUPABASE_URL is not set');
} else if (supabaseUrl === 'your_supabase_url') {
  console.log('❌ VITE_SUPABASE_URL has a placeholder value: ' + supabaseUrl);
} else {
  console.log('✅ VITE_SUPABASE_URL is set: ' + supabaseUrl);
}

// Check VITE_SUPABASE_ANON_KEY
if (!supabaseAnonKey) {
  console.log('❌ VITE_SUPABASE_ANON_KEY is not set');
} else if (supabaseAnonKey === 'your_supabase_anon_key') {
  console.log('❌ VITE_SUPABASE_ANON_KEY has a placeholder value');
} else {
  console.log('✅ VITE_SUPABASE_ANON_KEY is set');
}

// Check SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceRoleKey) {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY is not set');
} else if (supabaseServiceRoleKey === 'your_supabase_service_role_key') {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY has a placeholder value');
} else {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY is set');
}

// Test connection if all variables are set
if (supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey && 
    supabaseUrl !== 'your_supabase_url' && 
    supabaseAnonKey !== 'your_supabase_anon_key' && 
    supabaseServiceRoleKey !== 'your_supabase_service_role_key') {
  
  console.log('\nTesting connection to Supabase...');
  
  try {
    // Create Supabase client with anon key
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    
    // Create Supabase client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Test anon connection
    console.log('Testing anonymous connection...');
    const anonTest = await supabaseAnon.from('property_analyses').select('count');
    
    if (anonTest.error) {
      console.log('❌ Anonymous connection test failed: ' + anonTest.error.message);
    } else {
      console.log('✅ Anonymous connection test successful');
    }
    
    // Test service role connection
    console.log('\nTesting service role connection...');
    const adminTest = await supabaseAdmin.from('property_analyses').select('count');
    
    if (adminTest.error) {
      console.log('❌ Service role connection test failed: ' + adminTest.error.message);
    } else {
      console.log('✅ Service role connection test successful');
      console.log(`Found ${adminTest.data[0]?.count || 0} properties in the database`);
    }
    
    // Check RLS policies
    console.log('\nChecking RLS policies...');
    const policiesQuery = await supabaseAdmin.rpc('exec_sql', {
      sql: "SELECT * FROM pg_policies WHERE tablename = 'property_analyses'"
    });
    
    if (policiesQuery.error) {
      if (policiesQuery.error.message.includes('function "exec_sql" does not exist')) {
        console.log('❌ exec_sql function does not exist');
        console.log('Please run the SQL in scripts/supabase-dashboard-instructions.md to set up RLS policies');
      } else {
        console.log('❌ Error checking RLS policies: ' + policiesQuery.error.message);
      }
    } else {
      console.log('✅ Successfully retrieved RLS policies');
      
      // Check for the specific policy we need
      const policies = policiesQuery.data;
      const hasSharedPolicy = policies.some(p => 
        p.policyname === 'Users can view own or shared properties' && 
        p.cmd === 'SELECT'
      );
      
      if (hasSharedPolicy) {
        console.log('✅ "Users can view own or shared properties" policy is correctly set up');
      } else {
        console.log('❌ "Users can view own or shared properties" policy is not set up');
        console.log('Please run the SQL in scripts/supabase-dashboard-instructions.md to set up RLS policies');
      }
    }
  } catch (error) {
    console.error('❌ Error testing connection:', error.message);
  }
} else {
  console.log('\n❌ Cannot test connection because some environment variables are not properly set');
  console.log('Please run scripts/setup-supabase-env.js to set up your environment variables.');
}

console.log('\n=== Environment Check Complete ==='); 