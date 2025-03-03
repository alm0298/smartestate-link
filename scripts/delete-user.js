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
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node scripts/delete-user.js');
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

async function deleteUser() {
  try {
    console.log('=== Delete Supabase User ===\n');
    
    // Get user email
    const email = await prompt('Enter email of user to delete: ');
    
    if (!email) {
      console.error('Error: Email is required');
      process.exit(1);
    }
    
    console.log(`\nSearching for user with email: ${email}...`);
    
    // First, find the user by email to get their ID
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (userError) {
      console.error('Error finding user:', userError.message);
      
      // Try alternative method to find user
      console.log('Trying alternative method to find user...');
      
      // Get user by admin API
      const { data: { users }, error: adminError } = await supabase.auth.admin.listUsers();
      
      if (adminError) {
        console.error('Error listing users:', adminError.message);
        process.exit(1);
      }
      
      const user = users.find(u => u.email === email);
      
      if (!user) {
        console.error(`User with email ${email} not found`);
        process.exit(1);
      }
      
      console.log(`User found with ID: ${user.id}`);
      
      // Delete the user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error('Error deleting user:', deleteError.message);
        process.exit(1);
      }
      
      console.log(`\nUser ${email} deleted successfully!`);
      
      // Check if profiles table exists and delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('email', email);
      
      if (profileError) {
        if (profileError.code === '42P01') {
          console.log('No profiles table found, skipping profile deletion');
        } else {
          console.error('Error deleting profile:', profileError.message);
        }
      } else {
        console.log('User profile deleted successfully!');
      }
      
      return;
    }
    
    if (!userData) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }
    
    console.log(`User found with ID: ${userData.id}`);
    
    // Delete the user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userData.id);
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError.message);
      process.exit(1);
    }
    
    console.log(`\nUser ${email} deleted successfully!`);
    
    // Check if profiles table exists and delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('email', email);
    
    if (profileError) {
      if (profileError.code === '42P01') {
        console.log('No profiles table found, skipping profile deletion');
      } else {
        console.error('Error deleting profile:', profileError.message);
      }
    } else {
      console.log('User profile deleted successfully!');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err.message);
  } finally {
    rl.close();
  }
}

deleteUser(); 