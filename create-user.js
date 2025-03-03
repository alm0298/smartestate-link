// Script to create a new user in Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl || supabaseUrl === 'your_supabase_url') {
  console.error('Error: VITE_SUPABASE_URL is not set in .env file');
  console.log('Please update your .env file with your actual Supabase URL');
  process.exit(1);
}

if (!supabaseServiceKey || supabaseServiceKey === 'your_supabase_service_role_key') {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not set in .env file');
  console.log('Please update your .env file with your actual Supabase service role key');
  process.exit(1);
}

// Create Supabase admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// User details
const userEmail = 'ariel.almos@gmail.com';
const userPassword = '123456';
const userData = {
  full_name: 'Ariel Almos',
  role: 'admin'
};

async function createUser() {
  console.log(`Attempting to create user: ${userEmail}`);
  
  try {
    // Create the user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true, // Auto-confirm the email
      user_metadata: userData
    });

    if (authError) {
      console.error('Error creating user:', authError.message);
      return;
    }

    console.log('User created successfully!');
    console.log('User ID:', authData.user.id);
    
    // Check if we need to create a profile entry
    try {
      // Check if profiles table exists
      const { data: tableData, error: tableError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (!tableError) {
        // If profiles table exists, insert the profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .upsert([
            {
              id: authData.user.id,
              full_name: userData.full_name,
              role: userData.role,
              email: userEmail,
              updated_at: new Date()
            }
          ]);

        if (profileError) {
          console.error('Error creating profile:', profileError.message);
        } else {
          console.log('Profile created successfully!');
        }
      }
    } catch (err) {
      console.log('Note: Could not create profile entry. This is normal if the profiles table does not exist.');
    }

    console.log('\nUser Details:');
    console.log('Email:', userEmail);
    console.log('Password:', userPassword);
    console.log('Role:', userData.role);
    console.log('\nThe user can now log in with these credentials.');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

// Execute the function
createUser(); 