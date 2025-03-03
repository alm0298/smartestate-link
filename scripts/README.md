# SmartEstate Link Scripts

This directory contains utility scripts for managing your SmartEstate Link application.

## Environment Setup

### `setup-supabase-env.js`

This script helps you set up your Supabase environment variables in the `.env` file.

**Usage:**
```bash
node scripts/setup-supabase-env.js
```

The script will:
1. Prompt you for your Supabase URL and API keys
2. Optionally set up Google Maps and OpenAI API keys
3. Create or update your `.env` file with these values
4. Test the connection to your Supabase database

You can find your Supabase credentials in the Supabase dashboard:
1. Go to https://app.supabase.com
2. Select your project
3. Navigate to Project Settings > API
4. Copy the URL, anon key, and service role key

## Database and RLS Management

### `check-database.sql`

This SQL script can be run in the Supabase SQL Editor to check your database and RLS policies.

**Usage:**
1. Go to https://app.supabase.com
2. Select your project
3. Navigate to SQL Editor
4. Copy and paste the contents of `check-database.sql`
5. Run the SQL commands

### `fix-rls-policies.js`

This script checks and fixes Row Level Security (RLS) policies for your Supabase tables.

**Usage:**
```bash
node scripts/fix-rls-policies.js
```

The script will:
1. Check your database for properties and property shares
2. Check existing RLS policies
3. Ask if you want to fix RLS policies
4. If yes, it will drop existing policies and create new ones that allow:
   - Users to view their own properties
   - Users to view properties shared with them
   - Users to insert, update, and delete their own properties

**Note:** This script requires the Supabase service role key to be set in your `.env` file. If you haven't set it up yet, run `setup-supabase-env.js` first.

## Troubleshooting

If you encounter issues with the scripts:

1. Make sure your `.env` file has the correct Supabase credentials
2. Check that you have the required Node.js packages installed:
   ```bash
   npm install dotenv @supabase/supabase-js
   ```
3. If you get "Invalid API key" errors, run `setup-supabase-env.js` to update your credentials
4. If RLS policy updates fail, you can run the SQL commands manually in the Supabase SQL Editor 