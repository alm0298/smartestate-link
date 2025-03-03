#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

async function main() {
  console.log('\n=== Supabase Environment Setup ===\n');
  console.log('This script will help you set up your Supabase environment variables.');
  console.log('You can find these values in your Supabase project dashboard at https://app.supabase.com');
  console.log('Navigate to your project > Settings > API\n');

  // Get Supabase URL and keys
  const supabaseUrl = await prompt('Enter your Supabase URL: ');
  const supabaseAnonKey = await prompt('Enter your Supabase anon key: ');
  const supabaseServiceRoleKey = await prompt('Enter your Supabase service role key: ');
  
  // Optional: Get Google Maps API key
  const useGoogleMaps = await prompt('Do you want to set up Google Maps API? (y/n): ');
  let googleMapsApiKey = '';
  if (useGoogleMaps.toLowerCase() === 'y') {
    googleMapsApiKey = await prompt('Enter your Google Maps API key: ');
  }

  // Optional: Get OpenAI API key
  const useOpenAI = await prompt('Do you want to set up OpenAI API? (y/n): ');
  let openaiApiKey = '';
  if (useOpenAI.toLowerCase() === 'y') {
    openaiApiKey = await prompt('Enter your OpenAI API key: ');
  }

  // Create .env file content
  const envContent = `# Supabase Configuration
VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}
# Service role key is needed for admin operations (like creating users)
# IMPORTANT: Keep this key secure and never expose it in client-side code
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceRoleKey}

${useOpenAI.toLowerCase() === 'y' ? `# OpenAI API Key for content analysis
OPENAI_API_KEY=${openaiApiKey}
` : '# OpenAI API Key for content analysis (optional)\n# OPENAI_API_KEY=your_openai_api_key\n'}
${useGoogleMaps.toLowerCase() === 'y' ? `# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=${googleMapsApiKey}
` : '# Google Maps API Key (optional)\n# VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key\n'}
# API URL (if needed)
VITE_API_URL=http://localhost:3000
`;

  // Write to .env file
  const envPath = path.join(process.cwd(), '.env');
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Environment variables have been set up successfully!');
  console.log(`The .env file has been created at: ${envPath}`);
  console.log('\nYou can now run your application with the proper Supabase configuration.');
  
  rl.close();
}

main().catch(err => {
  console.error('Error:', err);
  rl.close();
}); 