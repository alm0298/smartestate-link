#!/bin/bash

# This script helps set up GitHub repository secrets for GitHub Pages deployment

# Check if gh CLI is authenticated
if ! gh auth status &>/dev/null; then
  echo "Error: You need to authenticate with GitHub first."
  echo "Run 'gh auth login' and follow the prompts."
  exit 1
fi

# Get repository name
REPO=$(git config --get remote.origin.url | sed 's/.*github.com[:\/]\(.*\)\.git/\1/')
echo "Setting up secrets for repository: $REPO"

# Function to set a secret
set_secret() {
  local name=$1
  local prompt=$2
  
  echo -n "$prompt: "
  read -s value
  echo
  
  if [ -z "$value" ]; then
    echo "Warning: Empty value provided for $name. Skipping."
    return
  fi
  
  echo "Setting secret: $name"
  echo "$value" | gh secret set "$name" -R "$REPO"
}

# Set up the required secrets
set_secret "VITE_SUPABASE_URL" "Enter your Supabase URL"
set_secret "VITE_SUPABASE_ANON_KEY" "Enter your Supabase anonymous key"
set_secret "VITE_GOOGLE_MAPS_API_KEY" "Enter your Google Maps API key (press Enter to skip)"
set_secret "VITE_API_URL" "Enter your API URL (press Enter to skip)"

echo "Secrets have been set up successfully!"
echo "Now, go to your GitHub repository settings to enable GitHub Pages:"
echo "1. Navigate to https://github.com/$REPO/settings/pages"
echo "2. Under 'Build and deployment', select 'GitHub Actions' as the source"
echo "3. Your site will be deployed to: https://$(echo $REPO | cut -d'/' -f1).github.io/$(echo $REPO | cut -d'/' -f2)/" 