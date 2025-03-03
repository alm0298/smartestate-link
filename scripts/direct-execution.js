// Simple script to fix RLS policies directly
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase credentials (do not share these)
const supabaseUrl = 'https://lwsesoxppmoerwwvvdar.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3c2Vzb3hwcG1vZXJ3d3Z2ZGFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc4NjY3OCwiZXhwIjoyMDU1MzYyNjc4fQ.iG9p82LnpDHIeg-IoqJEZ3pHAH3aukBa2KlcW6x9pn8';

// Simple function to execute SQL directly
async function executeSql() {
  console.log('🚀 Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'simple-fix.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Split into individual statements
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  console.log(`Found ${statements.length} SQL statements to execute`);

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
    console.log(statement.substring(0, 60) + '...');

    try {
      // Execute SQL directly using PostgreSQL
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.log(`Error: ${error.message}`);
        console.log('Attempting direct query execution...');
        
        // Try direct execution for some statements
        if (statement.toLowerCase().startsWith('drop policy') || 
            statement.toLowerCase().startsWith('create policy') ||
            statement.toLowerCase().startsWith('alter table')) {
          const { error: directError } = await supabase.auth.admin.executeSql(statement);
          
          if (directError) {
            console.log(`Direct execution error: ${directError.message}`);
          } else {
            console.log('Direct execution successful!');
          }
        }
      } else {
        console.log('Success!');
      }
    } catch (err) {
      console.log(`Exception: ${err.message}`);
    }
  }

  console.log('\n✅ Completed SQL execution');
  
  // Check RLS status
  try {
    const { data, error } = await supabase
      .from('pg_class')
      .select('relrowsecurity')
      .eq('relname', 'property_analyses')
      .single();
    
    if (error) {
      console.log(`Error checking RLS status: ${error.message}`);
    } else {
      console.log(`RLS enabled: ${data?.relrowsecurity}`);
    }
  } catch (err) {
    console.log(`Exception checking RLS: ${err.message}`);
  }
  
  // Check policies
  try {
    const { data, error } = await supabase
      .from('pg_policies')
      .select('policyname, cmd')
      .eq('tablename', 'property_analyses');
    
    if (error) {
      console.log(`Error checking policies: ${error.message}`);
    } else {
      console.log('\nCurrent policies:');
      if (data?.length) {
        data.forEach(policy => {
          console.log(`- ${policy.policyname} (${policy.cmd})`);
        });
      } else {
        console.log('No policies found.');
      }
    }
  } catch (err) {
    console.log(`Exception checking policies: ${err.message}`);
  }
}

// Run the function
executeSql().catch(console.error); 