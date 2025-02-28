#!/bin/bash

# Create a temporary directory for deployment
mkdir -p temp-deploy

# Copy the test page to the temporary directory
cp test-page.html temp-deploy/index.html

# Use the gh-pages npm package to deploy
npx gh-pages -d temp-deploy

# Clean up
rm -rf temp-deploy

echo "Test page deployed to https://alm0298.github.io/smartestate-link/" 