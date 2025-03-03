#!/usr/bin/env node

// Import required modules
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize dotenv with the path to the .env file
dotenv.config({ path: resolve(__dirname, '../.env') });

// Create Supabase client
const supabaseUrl = 'https://lwsesoxppmoerwwvvdar.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('Error: Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  console.error('Please set this in your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkDatabase() {
  console.log('Checking database...');
  
  try {
    // Check property_analyses table
    const { data: properties, error: propertiesError } = await supabase
      .from('property_analyses')
      .select('id, user_id, address')
      .order('created_at', { ascending: false });
    
    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
      return;
    }
    
    console.log(`Found ${properties.length} properties in the database:`);
    properties.forEach((property, index) => {
      console.log(`${index + 1}. ID: ${property.id}, User ID: ${property.user_id}, Address: ${property.address}`);
    });
    
    // Check property_shares table
    const { data: shares, error: sharesError } = await supabase
      .from('property_shares')
      .select('id, property_id, user_id, created_at');
    
    if (sharesError) {
      console.error('Error fetching property shares:', sharesError);
      return;
    }
    
    console.log(`\nFound ${shares.length} property shares in the database:`);
    shares.forEach((share, index) => {
      console.log(`${index + 1}. Property ID: ${share.property_id}, Shared with User ID: ${share.user_id}`);
    });
    
    // Check if there are any properties with shares
    if (properties.length > 0 && shares.length > 0) {
      const propertiesWithShares = properties.filter(property => 
        shares.some(share => share.property_id === property.id)
      );
      
      console.log(`\n${propertiesWithShares.length} properties have shares.`);
      
      if (propertiesWithShares.length > 0) {
        console.log('Properties with shares:');
        propertiesWithShares.forEach((property, index) => {
          const propertyShares = shares.filter(share => share.property_id === property.id);
          console.log(`${index + 1}. Property ID: ${property.id}, Address: ${property.address}`);
          console.log(`   Shared with ${propertyShares.length} users: ${propertyShares.map(s => s.user_id).join(', ')}`);
        });
      }
    }
    
    // Check RLS policies
    const { data: policies, error: policiesError } = await supabase.rpc('get_policies_for_table', { table_name: 'property_analyses' });
    
    if (policiesError) {
      console.error('Error fetching RLS policies:', policiesError);
      console.log('Trying alternative method...');
      
      const { data: directPolicies, error: directPoliciesError } = await supabase.rpc('exec_sql', { 
        sql: "SELECT * FROM pg_policies WHERE tablename = 'property_analyses';" 
      });
      
      if (directPoliciesError) {
        console.error('Error fetching RLS policies directly:', directPoliciesError);
        return;
      }
      
      console.log('\nRLS Policies for property_analyses table:');
      console.log(directPolicies);
    } else {
      console.log('\nRLS Policies for property_analyses table:');
      console.log(policies);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Execute the function
checkDatabase(); 