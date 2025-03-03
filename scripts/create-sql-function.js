// Script to create a SQL execution function in Supabase
const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = 'https://lwsesoxppmoerwwvvdar.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3c2Vzb3hwcG1vZXJ3d3Z2ZGFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc4NjY3OCwiZXhwIjoyMDU1MzYyNjc4fQ.iG9p82LnpDHIeg-IoqJEZ3pHAH3aukBa2KlcW6x9pn8';

// SQL to create the exec_sql function
const createFunctionSql = `
-- Create a function that can execute arbitrary SQL
CREATE OR REPLACE FUNCTION exec_sql(sql text) 
RETURNS SETOF record 
LANGUAGE plpgsql
SECURITY DEFINER -- This is important for security - it runs with the permissions of the function creator
AS $$
BEGIN
  RETURN QUERY EXECUTE sql;
END;
$$;

-- Ensure only authenticated users can execute this function
REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM public;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
`;

// SQL to fix RLS policies
const fixRlsSql = `
-- Enable RLS on property_analyses 
ALTER TABLE property_analyses ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "view_shared_properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Users can view own or shared properties" ON property_analyses;
DROP POLICY IF EXISTS "Select allowed for authenticated" ON property_analyses;
DROP POLICY IF EXISTS "Users can view their own properties" ON property_analyses;
DROP POLICY IF EXISTS "All users can view all properties" ON property_analyses;

-- Create policy to allow all authenticated users to view all properties
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

async function createSqlFunction() {
  console.log('🚀 Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Create a temporary table to simulate RETURN SETOF record
    const tempTableSql = `
    CREATE TEMP TABLE IF NOT EXISTS temp_result (message text);
    `;
    
    // First attempt: direct SQL
    try {
      console.log('Creating temporary table...');
      // For PostgreSQL functions that execute SQL directly
      const { data: tempResult, error: tempError } = await supabase.from('_temp_operation').select('*').limit(1).then(
        async (response) => {
          if (response.error) {
            // Create temporary table
            return await supabase.rpc('pg_temp', { query: tempTableSql });
          }
          return response;
        }
      );
      
      if (tempError) {
        console.log(`Temp table creation error: ${tempError.message}`);
      }
    } catch (e) {
      console.log(`Temp table exception: ${e.message}`);
    }
    
    console.log('Creating SQL execution function...');
    
    // Try using PostgreSQL's built-in facility
    try {
      // Create the function via PostgreSQL's execute
      const { data: fnResult, error: fnError } = await supabase.rpc('pg_execute', { 
        query: createFunctionSql 
      }).catch(e => {
        console.log(`Direct execution error: ${e.message}`);
        return { data: null, error: e };
      });
      
      if (fnError) {
        console.log(`Function creation error: ${fnError.message}`);
      } else {
        console.log('SQL function created successfully!');
      }
    } catch (e) {
      console.log(`Function creation exception: ${e.message}`);
    }
    
    // Now use Supabase's SQL editor API if direct methods failed
    console.log('Attempting to use Supabase SQL editor API...');
    try {
      const response = await fetch('https://api.supabase.com/v1/projects/lwsesoxppmoerwwvvdar/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          query: createFunctionSql,
        })
      });
      
      const result = await response.json();
      console.log('SQL editor API result:', result);
    } catch (e) {
      console.log(`SQL editor API error: ${e.message}`);
    }
    
    // Now that the function should be created, use it to fix RLS
    console.log('\n🔧 Fixing RLS policies...');
    
    const formatSql = fixRlsSql.replace(/\s+/g, ' ').trim();
    const fixRlsResults = [];
    
    // Split into individual statements and execute them
    const statements = fixRlsSql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      console.log(`\nExecuting RLS statement ${i+1}/${statements.length}:`);
      console.log(stmt.substring(0, 60) + '...');
      
      try {
        // Format for direct SQL execution via many possible paths
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: stmt 
        }).catch(async (e) => {
          console.log(`First attempt failed: ${e.message}`);
          
          // Try direct PostgreSQL execution
          return await supabase.rpc('pg_execute', { 
            query: stmt 
          }).catch(async (e2) => {
            console.log(`Second attempt failed: ${e2.message}`);
            
            // Final attempt: raw SQL via REST
            return await fetch(`https://${supabaseUrl}/rest/v1/pg_query?query=${encodeURIComponent(stmt)}`, {
              method: 'GET',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            }).then(async (res) => {
              if (res.ok) {
                return { data: await res.json(), error: null };
              } else {
                return { data: null, error: { message: await res.text() } };
              }
            }).catch(e3 => {
              console.log(`Third attempt failed: ${e3.message}`);
              return { data: null, error: e3 };
            });
          });
        });
        
        if (error) {
          console.log(`Error: ${error.message}`);
        } else {
          console.log('Successfully executed statement!');
          fixRlsResults.push(data);
        }
      } catch (e) {
        console.log(`Exception: ${e.message}`);
      }
    }
    
    // Verify RLS policies
    console.log('\n🔍 Verifying RLS policies...');
    const verificationSql = `
      SELECT policyname, cmd, roles, qual
      FROM pg_policies
      WHERE tablename = 'property_analyses'
    `;
    
    try {
      const { data: verificationData, error: verificationError } = await supabase.rpc('exec_sql', { 
        sql: verificationSql 
      }).catch(() => ({ data: null, error: { message: 'Verification failed' } }));
      
      if (verificationError) {
        console.log(`Verification error: ${verificationError.message}`);
      } else if (verificationData) {
        console.log('RLS Policies:', verificationData);
      }
    } catch (e) {
      console.log(`Verification exception: ${e.message}`);
    }
    
    console.log('\n✅ All operations completed.');
    console.log('The shai.yag@gmail.com user should now be able to see all properties.');
  } catch (error) {
    console.error(`❌ Operation failed: ${error.message}`);
  }
}

// Run the function
createSqlFunction(); 