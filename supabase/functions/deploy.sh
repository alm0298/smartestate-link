#!/bin/bash

# Deploy all functions or specific ones if provided as arguments
if [ $# -eq 0 ]; then
  echo "Deploying all functions..."
  supabase functions deploy analyze-content
  supabase functions deploy analyze-property
  supabase functions deploy proxy-image
else
  for func in "$@"; do
    echo "Deploying function: $func"
    supabase functions deploy "$func"
  done
fi

echo "Deployment complete!" 