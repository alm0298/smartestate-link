#!/bin/bash

# SmartEstate Property Sharing Fix Script
# This script installs necessary dependencies and runs the property sharing fix tool

echo "📦 SmartEstate: Property Sharing Fix Tool 📦"
echo "----------------------------------------"

# Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is required but not installed."
  echo "Please install Node.js from https://nodejs.org/ and try again."
  exit 1
fi

# Navigate to the scripts directory
cd "$(dirname "$0")/scripts" || {
  echo "❌ Could not find the scripts directory."
  echo "Make sure you're running this script from the root of your SmartEstate project."
  exit 1
}

# Install dependencies if needed
if [ ! -d "../node_modules/@supabase/supabase-js" ]; then
  echo "📥 Installing dependencies..."
  npm install @supabase/supabase-js --no-save
  if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies. Please try again."
    exit 1
  fi
  echo "✅ Dependencies installed successfully."
else
  echo "✅ Dependencies already installed."
fi

# Run the fix script
echo "🔧 Running property sharing fix script..."
node fix-properties.js
if [ $? -ne 0 ]; then
  echo "❌ An error occurred while running the fix script."
  echo "Please check the error message above and try again."
  exit 1
fi

echo "----------------------------------------"
echo "✅ Property sharing fix process completed."
echo "   If you encountered any errors, follow the instructions above to fix manually." 