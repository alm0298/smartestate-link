import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// User details to create
const userEmail = 'ariel.almos@gmail.com';
const userPassword = '123456';
const userData = {
  full_name: 'Ariel Almos',
  role: 'admin'
};

// Function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('=== Create Supabase User ===');
  console.log('This script will create a new user in your Supabase project.');
  console.log('You will need your Supabase URL and service role key.');
  console.log('You can find these in your Supabase dashboard under Project Settings > API.\n');

  // Get Supabase credentials from user input
  const supabaseUrl = await prompt('Enter your Supabase URL: ');
  const supabaseServiceKey = await prompt('Enter your Supabase service role key: ');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Supabase credentials are required');
    rl.close();
    return;
  }

  // Create Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log(`\nAttempting to create user: ${userEmail}`);
    
    // Create the user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true, // Auto-confirm the email
      user_metadata: userData
    });

    if (authError) {
      console.error('Error creating user:', authError.message);
      rl.close();
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
  } finally {
    rl.close();
  }
}

// Execute the main function
main(); 