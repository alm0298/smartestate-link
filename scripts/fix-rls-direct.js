// Script to fix RLS policies by direct SQL execution using the REST API
const https = require('https');

// Supabase credentials
const supabaseUrl = 'lwsesoxppmoerwwvvdar.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3c2Vzb3hwcG1vZXJ3d3Z2ZGFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc4NjY3OCwiZXhwIjoyMDU1MzYyNjc4fQ.iG9p82LnpDHIeg-IoqJEZ3pHAH3aukBa2KlcW6x9pn8';

// SQL to execute - fix RLS policies to allow all users to see all properties
const sql = `
-- Enable RLS on property_analyses
ALTER TABLE property_analyses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "view_shared_properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view own or shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Select allowed for authenticated" ON property_analyses;
DROP POLICY IF EXISTS "Users can view their own properties" ON property_analyses;
DROP POLICY IF EXISTS "All users can view all properties" ON property_analyses;

-- Create simple policy to allow all authenticated users to view all properties
CREATE POLICY "All users can view all properties"
ON property_analyses
FOR SELECT
TO authenticated
USING (true);

-- Create policies for managing properties
CREATE POLICY "Users can insert their own properties"
ON property_analyses
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own properties"
ON property_analyses
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own properties"
ON property_analyses
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
`;

// Function to make a REST API request to execute the SQL
function executeSql(sqlStatement) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: supabaseUrl,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Status Code: ${res.statusCode}, Response: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(JSON.stringify({ sql: sqlStatement }));
    req.end();
  });
}

// Function to execute SQL directly via the REST API
async function fixRlsPolicies() {
  console.log('🔧 Fixing RLS policies directly...');
  
  try {
    const result = await executeSql(sql);
    console.log('✅ Successfully executed SQL');
    console.log(result);
    
    // Verify the policies are set up correctly
    console.log('\n🔍 Verifying RLS policies...');
    const verificationSql = `
      SELECT policyname, cmd, roles, qual
      FROM pg_policies
      WHERE tablename = 'property_analyses'
    `;
    
    const verificationResult = await executeSql(verificationSql);
    console.log('Current policies:');
    console.log(verificationResult);
    
    console.log('\n✅ All done! Users should now be able to see all properties.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Try postgres-specific method if the RPC method fails
    console.log('\n🔄 Trying alternative method...');
    const urlEncodedSql = encodeURIComponent(sql);
    
    const options = {
      hostname: supabaseUrl,
      path: `/pg?sql=${urlEncodedSql}`,
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    };
    
    https.get(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Alternative method succeeded!');
          console.log(data);
        } else {
          console.error(`❌ Alternative method failed: ${res.statusCode}, ${data}`);
          console.log('\n⚠️ Please run the SQL directly in the Supabase dashboard SQL editor.');
        }
      });
    }).on('error', (err) => {
      console.error(`❌ Alternative method error: ${err.message}`);
      console.log('\n⚠️ Please run the SQL directly in the Supabase dashboard SQL editor.');
    });
  }
}

// Run the function
fixRlsPolicies(); 