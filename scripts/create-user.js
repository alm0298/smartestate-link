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
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Function to prompt for user input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createUser() {
  try {
    console.log('=== Create New Supabase User ===\n');
    console.log(`Supabase URL: ${supabaseUrl}`);
    
    // If service key is not provided in environment, ask for it
    if (!supabaseServiceKey) {
      console.log('\nYou need your Supabase service role key to continue.');
      console.log('You can find it in your Supabase dashboard under Project Settings > API.\n');
      supabaseServiceKey = await prompt('Enter your Supabase service role key: ');
      
      if (!supabaseServiceKey) {
        console.error('Error: Supabase service role key is required');
        process.exit(1);
      }
    }
    
    // Create Supabase admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user details
    const email = await prompt('Enter email: ');
    const password = await prompt('Enter password (min 6 characters): ');
    const fullName = await prompt('Enter full name: ');
    
    console.log('\nCreating user...');
    
    // Create user with admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName
      }
    });
    
    if (error) {
      console.error('Error creating user:', error.message);
      process.exit(1);
    }
    
    console.log('\nUser created successfully!');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('Full Name:', data.user.user_metadata.full_name);
    
    // Create profile entry if needed
    const createProfile = await prompt('\nDo you want to create a profile entry? (y/n): ');
    
    if (createProfile.toLowerCase() === 'y') {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          email: email
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError.message);
      } else {
        console.log('Profile created successfully!');
      }
    }
    
  } catch (err) {
    console.error('Unexpected error:', err.message);
  } finally {
    rl.close();
  }
}

createUser(); 