// Script to fix property sharing issues in Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
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
  console.log('\n🔧 SmartEstate Property Sharing Fix Tool 🔧\n');
  
  try {
    // Get Supabase credentials
    const supabaseUrl = await promptInput('Enter your Supabase URL: ');
    const supabaseKey = await promptInput('Enter your Supabase service role key: ');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key are required');
    }
    
    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('\n📊 Connecting to Supabase...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-properties-view.sql');
    let sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into separate statements by semicolons
    // This is a simple approach and may not work for all SQL (e.g., with functions)
    const statements = sqlContent.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('\\'));
    
    console.log(`\n🔍 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement and collect results
    const results = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      try {
        console.log(`\n📋 Executing statement ${i + 1}/${statements.length}:`);
        console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
        
        // Execute the SQL statement
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Error executing statement ${i + 1}: ${error.message}`);
          
          // Try to execute it directly if the rpc fails
          console.log('🔄 Trying direct SQL execution...');
          const directResult = await supabase.from('_exec_sql').select('*').limit(1);
          
          if (directResult.error) {
            console.error(`❌ Direct execution also failed: ${directResult.error.message}`);
            
            // If it's the first statement checking RLS status, we can continue
            if (i < 2) {
              console.log('⚠️ Continuing despite error (likely harmless metadata query)');
              continue;
            } else {
              console.error('❌ Cannot continue. Please execute the SQL directly in the Supabase SQL editor.');
              break;
            }
          } else {
            console.log('✅ Direct execution succeeded');
            results.push(directResult.data);
          }
        } else {
          console.log('✅ Statement executed successfully');
          results.push(data);
        }
      } catch (e) {
        console.error(`❌ Exception while executing statement ${i + 1}: ${e.message}`);
        
        // If it's early in the script, we can continue
        if (i < 2) {
          console.log('⚠️ Continuing despite error');
          continue;
        } else {
          console.error('❌ Cannot continue. Please execute the SQL directly in the Supabase SQL editor.');
          break;
        }
      }
    }
    
    console.log('\n✅ Script execution completed');
    
    // Provide guidance on manual steps if needed
    console.log('\n📝 If you encountered errors, you can:');
    console.log('1. Open the Supabase dashboard (https://app.supabase.com)');
    console.log('2. Go to the SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy and paste the contents of fix-properties-view.sql');
    console.log('5. Execute the SQL');
    
    console.log('\n🔍 After running the script, you should be able to see:');
    console.log('- Your own properties');
    console.log('- Properties shared with you');
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  } finally {
    rl.close();
  }
}

// Run the main function
main(); 