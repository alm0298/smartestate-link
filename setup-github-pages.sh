#!/bin/bash

# This script automatically sets up GitHub Pages deployment with your existing credentials

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up GitHub Pages for SmartEstate Link${NC}"
echo "----------------------------------------"

# Step 1: Install GitHub CLI if not already installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}GitHub CLI not found. Installing...${NC}"
    brew install gh
else
    echo -e "${GREEN}GitHub CLI already installed.${NC}"
fi

# Step 2: Authenticate with GitHub if not already authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}You need to authenticate with GitHub.${NC}"
    echo "Please follow the prompts to log in to GitHub:"
    gh auth login
else
    echo -e "${GREEN}Already authenticated with GitHub.${NC}"
fi

# Step 3: Get repository information
REPO="alm0298/smartestate-link"
echo -e "${GREEN}Setting up secrets for repository: ${REPO}${NC}"

# Step 4: Set up the required secrets
echo -e "${YELLOW}Setting up repository secrets...${NC}"

# Supabase URL
SUPABASE_URL="https://lwsesoxppmoerwwvvdar.supabase.co"
echo "Setting secret: VITE_SUPABASE_URL"
echo "$SUPABASE_URL" | gh secret set "VITE_SUPABASE_URL" -R "$REPO"

# Supabase Anonymous Key
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3c2Vzb3hwcG1vZXJ3d3Z2ZGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODY2NzgsImV4cCI6MjA1NTM2MjY3OH0.dAhb-hhKt74xLN1-PQzZFSpW38XE37q4Aw9ovO2x7o4"
echo "Setting secret: VITE_SUPABASE_ANON_KEY"
echo "$SUPABASE_ANON_KEY" | gh secret set "VITE_SUPABASE_ANON_KEY" -R "$REPO"

# Google Maps API Key
GOOGLE_MAPS_API_KEY="AIzaSyC3M9RG1Fnb0AT-gq1VRKA7xX5SKYuwBJk"
echo "Setting secret: VITE_GOOGLE_MAPS_API_KEY"
echo "$GOOGLE_MAPS_API_KEY" | gh secret set "VITE_GOOGLE_MAPS_API_KEY" -R "$REPO"

# API URL (using Supabase URL as default)
API_URL="$SUPABASE_URL"
echo "Setting secret: VITE_API_URL"
echo "$API_URL" | gh secret set "VITE_API_URL" -R "$REPO"

echo -e "${GREEN}Secrets have been set up successfully!${NC}"

# Step 5: Enable GitHub Pages
echo -e "${YELLOW}Checking GitHub Pages settings...${NC}"
PAGES_INFO=$(gh api repos/$REPO/pages 2>/dev/null || echo "not_enabled")

if [[ $PAGES_INFO == *"not_enabled"* ]]; then
    echo -e "${YELLOW}GitHub Pages is not enabled yet.${NC}"
    echo -e "${YELLOW}Enabling GitHub Pages with GitHub Actions...${NC}"
    
    # Create a temporary file for the API request
    TEMP_FILE=$(mktemp)
    echo '{"source": {"branch": "main", "path": "/"}}' > $TEMP_FILE
    
    # Try to enable GitHub Pages
    ENABLE_RESULT=$(gh api --method POST repos/$REPO/pages -f @$TEMP_FILE 2>&1 || echo "error")
    rm $TEMP_FILE
    
    if [[ $ENABLE_RESULT == *"error"* ]]; then
        echo -e "${RED}Could not automatically enable GitHub Pages.${NC}"
        echo -e "${YELLOW}Please enable it manually:${NC}"
        echo "1. Go to https://github.com/$REPO/settings/pages"
        echo "2. Under 'Build and deployment', select 'GitHub Actions' as the source"
    else
        echo -e "${GREEN}GitHub Pages has been enabled!${NC}"
    fi
else
    echo -e "${GREEN}GitHub Pages is already enabled.${NC}"
fi

# Step 6: Trigger a workflow run to deploy the site
echo -e "${YELLOW}Triggering a deployment workflow...${NC}"
gh workflow run deploy.yml -R "$REPO"

echo -e "${GREEN}Setup complete!${NC}"
echo "----------------------------------------"
echo -e "${GREEN}Your site will be deployed to: https://alm0298.github.io/smartestate-link/${NC}"
echo "The deployment may take a few minutes to complete."
echo "You can check the status at: https://github.com/$REPO/actions" 