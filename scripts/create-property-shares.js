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
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node scripts/create-property-shares.js');
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

async function setupPropertySharing() {
  try {
    console.log('=== Setting Up Property Sharing ===\n');
    
    // Step 1: Get the user ID for shai.yag@gmail.com
    console.log('Finding user ID for shai.yag@gmail.com...');
    
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError.message);
      process.exit(1);
    }
    
    const shaiUser = users.find(u => u.email === 'shai.yag@gmail.com');
    
    if (!shaiUser) {
      console.error('User shai.yag@gmail.com not found');
      process.exit(1);
    }
    
    console.log(`Found user with ID: ${shaiUser.id}`);
    
    // Step 2: Get all properties
    console.log('\nFetching all properties...');
    
    const { data: properties, error: propertiesError } = await supabase
      .from('property_analyses')
      .select('id, address, user_id');
    
    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError.message);
      process.exit(1);
    }
    
    if (!properties || properties.length === 0) {
      console.log('No properties found to share.');
      process.exit(0);
    }
    
    console.log(`Found ${properties.length} properties.`);
    
    // Step 3: Check if property_shares table exists by trying to select from it
    console.log('\nChecking if property_shares table exists...');
    
    let tableExists = true;
    try {
      const { error } = await supabase
        .from('property_shares')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        tableExists = false;
      }
    } catch (err) {
      tableExists = false;
    }
    
    // Step 4: If property_shares table doesn't exist, create it using a Supabase function
    if (!tableExists) {
      console.log('Property shares table does not exist.');
      console.log('Please create the property_shares table in your Supabase dashboard with the following structure:');
      console.log(`
        CREATE TABLE IF NOT EXISTS property_shares (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          property_id UUID NOT NULL REFERENCES property_analyses(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          UNIQUE(property_id, user_id)
        );
        
        -- Enable RLS
        ALTER TABLE property_shares ENABLE ROW LEVEL SECURITY;
        
        -- Create policies for property_shares
        CREATE POLICY "Property owners can manage shares"
        ON property_shares
        FOR ALL
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM property_analyses
            WHERE property_analyses.id = property_shares.property_id
            AND property_analyses.user_id = auth.uid()
          )
        );
        
        -- Update RLS policies for property_analyses
        DROP POLICY IF EXISTS "Users can view own properties" ON property_analyses;
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
      `);
      
      const proceed = await prompt('\nDid you create the property_shares table? (y/n): ');
      
      if (proceed.toLowerCase() !== 'y') {
        console.log('Exiting script. Please create the property_shares table and run the script again.');
        process.exit(0);
      }
    } else {
      console.log('Property shares table already exists.');
    }
    
    // Step 5: Share all properties with shai.yag@gmail.com
    console.log('\nSharing properties with shai.yag@gmail.com...');
    
    const propertyShares = properties.map(property => ({
      property_id: property.id,
      user_id: shaiUser.id
    }));
    
    // Insert property shares in batches to avoid potential issues with large payloads
    const batchSize = 10;
    for (let i = 0; i < propertyShares.length; i += batchSize) {
      const batch = propertyShares.slice(i, i + batchSize);
      const { error: shareError } = await supabase
        .from('property_shares')
        .upsert(batch, { onConflict: 'property_id,user_id' });
      
      if (shareError) {
        console.error(`Error sharing properties (batch ${i / batchSize + 1}):`, shareError.message);
        process.exit(1);
      }
      
      console.log(`Processed batch ${i / batchSize + 1} of ${Math.ceil(propertyShares.length / batchSize)}`);
    }
    
    console.log(`\nSuccessfully shared ${properties.length} properties with shai.yag@gmail.com!`);
    console.log('\nProperty sharing setup complete!');
    
  } catch (err) {
    console.error('Unexpected error:', err.message);
  } finally {
    rl.close();
  }
}

setupPropertySharing(); 