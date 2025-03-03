// Script to check the fetch error
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and anon key
const supabaseUrl = 'https://lwsesoxppmoerwwvvdar.supabase.co';
const supabaseAnonKey = 'YOUR_ANON_KEY'; // Replace with your actual anon key

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to fetch properties with user ID
async function fetchPropertiesWithUserId(userId) {
  console.log(`Fetching properties for user ID: ${userId}...`);
  
  try {
    // This is the exact query from your error
    const { data, error } = await supabase
      .from('property_analyses')
      .select('id,address,price,roi,images,details,monthly_rent,estimated_expenses,pros,cons,summary,score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching properties:', error);
      return;
    }
    
    console.log('Properties fetched successfully!');
    console.log(`Found ${data.length} properties`);
    
    // Print the first property if available
    if (data.length > 0) {
      console.log('First property:', {
        id: data[0].id,
        address: data[0].address
      });
    }
  } catch (err) {
    console.error('Exception fetching properties:', err);
  }
}

// Function to check if RLS is causing the issue
async function checkRLSIssue() {
  console.log('Checking if RLS is causing the issue...');
  
  try {
    // Try a simple query first
    const { data, error } = await supabase
      .from('property_analyses')
      .select('count(*)');
    
    if (error) {
      console.error('Error with simple query:', error);
      return;
    }
    
    console.log('Simple query successful!');
    console.log('Count result:', data);
  } catch (err) {
    console.error('Exception with simple query:', err);
  }
}

// Main function
async function main() {
  console.log('Fetch Error Check');
  console.log('================');
  
  // Check if RLS is causing the issue
  await checkRLSIssue();
  
  // Fetch properties for the specific user ID from your error
  const userId = '2cf9bdbb-6395-4599-abff-d1c12a3fa0e9';
  await fetchPropertiesWithUserId(userId);
  
  console.log('\nTest completed!');
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err);
}); 