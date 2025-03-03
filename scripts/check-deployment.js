// Script to check deployment issues with Supabase
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for input
const promptInput = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Main function
async function main() {
  console.log('\n🔍 SmartEstate Deployment Diagnostics Tool 🔍\n');
  
  try {
    // Get Supabase credentials
    const supabaseUrl = await promptInput('Enter your Supabase URL: ');
    const supabaseServiceKey = await promptInput('Enter your Supabase service role key: ');
    const userEmail = await promptInput('Enter your user email to test with: ');
    const userPassword = await promptInput('Enter your user password: ');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL and key are required');
    }
    
    // Initialize Supabase admin client with service role key
    console.log('\n🔧 Creating admin Supabase client...');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize Supabase anon client with anon key (get from URL)
    const anonKey = supabaseUrl.includes('supabase.co') 
      ? await promptInput('Enter your Supabase anon key: ')
      : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdXB0cHBsZnZpaWZyYndtbXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQyMzgxNTUsImV4cCI6MjAxOTgxNDE1NX0.st4_tKUj-3ZbXaxhYvECiYJa2i3BZrhjhYIXPJxUU53';
    
    console.log('\n🔧 Creating anon Supabase client...');
    const supabaseAnon = createClient(supabaseUrl, anonKey);
    
    // 1. Check connection to Supabase
    console.log('\n📡 Testing connection to Supabase...');
    try {
      const { data, error } = await supabaseAdmin.from('property_analyses').select('count(*)');
      if (error) {
        console.error('❌ Admin connection test failed:', error.message);
      } else {
        console.log('✅ Admin connection successful');
      }
    } catch (e) {
      console.error('❌ Admin connection test error:', e.message);
    }
    
    // 2. Check RLS policies on property_analyses table
    console.log('\n📋 Checking RLS policies for property_analyses...');
    try {
      const { data, error } = await supabaseAdmin.rpc('get_policies', { table_name: 'property_analyses' });
      
      if (error) {
        console.error('❌ Failed to retrieve policies with RPC:', error.message);
        console.log('🔄 Trying direct query...');
        
        // Fallback to direct query
        const { data: directData, error: directError } = await supabaseAdmin
          .from('pg_policies')
          .select('*')
          .eq('tablename', 'property_analyses');
        
        if (directError) {
          console.error('❌ Failed to retrieve policies with direct query:', directError.message);
        } else if (directData && directData.length > 0) {
          console.log('✅ Found policies with direct query:');
          directData.forEach(policy => {
            console.log(`   - ${policy.policyname}: ${policy.cmd} - ${policy.roles}`);
          });
        } else {
          console.log('❌ No policies found with direct query');
        }
      } else if (data && data.length > 0) {
        console.log('✅ Found policies with RPC:');
        data.forEach(policy => {
          console.log(`   - ${policy.policyname}: ${policy.cmd} - ${policy.roles}`);
        });
      } else {
        console.log('❌ No policies found with RPC');
      }
    } catch (e) {
      console.error('❌ Error checking policies:', e.message);
    }
    
    // 3. Check if RLS is enabled
    console.log('\n🔒 Checking if RLS is enabled for property_analyses...');
    try {
      const { data, error } = await supabaseAdmin.rpc('check_rls_enabled', { table_name: 'property_analyses' });
      
      if (error) {
        console.error('❌ Failed to check RLS status:', error.message);
        console.log('🔄 Trying direct query...');
        
        // Fallback to direct query
        const { data: directData, error: directError } = await supabaseAdmin
          .from('pg_class')
          .select('relrowsecurity')
          .eq('relname', 'property_analyses');
        
        if (directError) {
          console.error('❌ Failed to check RLS status with direct query:', directError.message);
        } else if (directData && directData.length > 0) {
          console.log(`${directData[0].relrowsecurity ? '✅ RLS is enabled' : '❌ RLS is NOT enabled'} for property_analyses`);
        }
      } else {
        console.log(`${data ? '✅ RLS is enabled' : '❌ RLS is NOT enabled'} for property_analyses`);
      }
    } catch (e) {
      console.error('❌ Error checking RLS status:', e.message);
    }
    
    // 4. Check property_shares table
    console.log('\n🔗 Checking property_shares table...');
    try {
      const { data, error } = await supabaseAdmin.from('property_shares').select('count(*)');
      
      if (error) {
        console.error('❌ Failed to query property_shares:', error.message);
      } else {
        const count = data && data.length > 0 ? data[0].count : 0;
        console.log(`✅ Found ${count} records in property_shares table`);
        
        if (count > 0) {
          const { data: shares, error: sharesError } = await supabaseAdmin
            .from('property_shares')
            .select('*')
            .limit(5);
          
          if (sharesError) {
            console.error('❌ Failed to fetch shares:', sharesError.message);
          } else if (shares && shares.length > 0) {
            console.log('✅ Sample property shares:');
            shares.forEach(share => {
              console.log(`   - Property: ${share.property_id} shared with user: ${share.user_id}`);
            });
          }
        }
      }
    } catch (e) {
      console.error('❌ Error checking property_shares:', e.message);
    }
    
    // 5. Test user authentication
    console.log('\n🔑 Testing user authentication...');
    try {
      const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email: userEmail,
        password: userPassword,
      });
      
      if (signInError) {
        console.error('❌ Failed to sign in:', signInError.message);
      } else {
        console.log('✅ Successfully signed in as', userEmail);
        
        // Get user properties
        console.log('\n📊 Fetching properties for authenticated user...');
        const userId = signInData.user.id;
        
        // Try with direct user_id filtering
        const { data: userProperties, error: userPropertiesError } = await supabaseAnon
          .from('property_analyses')
          .select('id, address')
          .eq('user_id', userId);
        
        if (userPropertiesError) {
          console.error('❌ Failed to fetch properties with user_id filter:', userPropertiesError.message);
        } else {
          console.log(`✅ Found ${userProperties.length} properties with user_id filter`);
        }
        
        // Try without filtering (relies on RLS)
        const { data: rlsProperties, error: rlsPropertiesError } = await supabaseAnon
          .from('property_analyses')
          .select('id, address');
        
        if (rlsPropertiesError) {
          console.error('❌ Failed to fetch properties with RLS:', rlsPropertiesError.message);
        } else {
          console.log(`✅ Found ${rlsProperties.length} properties with RLS`);
          
          if (rlsProperties.length > 0) {
            console.log('✅ Sample properties via RLS:');
            rlsProperties.slice(0, 3).forEach(prop => {
              console.log(`   - ${prop.address} (${prop.id})`);
            });
          }
        }
        
        // Check for any shared properties
        const { data: sharedProperties, error: sharedPropertiesError } = await supabaseAnon
          .from('property_shares')
          .select('property_id')
          .eq('user_id', userId);
        
        if (sharedPropertiesError) {
          console.error('❌ Failed to fetch shared properties:', sharedPropertiesError.message);
        } else {
          console.log(`✅ User has ${sharedProperties.length} properties shared with them`);
          
          if (sharedProperties.length > 0) {
            // Fetch details of shared properties
            const sharedIds = sharedProperties.map(s => s.property_id);
            const { data: sharedDetails, error: sharedDetailsError } = await supabaseAnon
              .from('property_analyses')
              .select('id, address')
              .in('id', sharedIds);
            
            if (sharedDetailsError) {
              console.error('❌ Failed to fetch shared property details:', sharedDetailsError.message);
            } else {
              console.log('✅ Shared properties details:');
              sharedDetails.forEach(prop => {
                console.log(`   - ${prop.address} (${prop.id})`);
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('❌ Error during authentication test:', e.message);
    }
    
    console.log('\n✅ Diagnostics completed! Review the output above for issues.');
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  } finally {
    rl.close();
  }
}

// Run the main function
main(); 