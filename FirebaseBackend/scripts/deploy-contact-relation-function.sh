#!/bin/bash

#############################################################
# LifeSignal Contact Relation Function Deployment Script
#
# This script builds and deploys the addContactRelation function
# to Firebase. It first builds the TypeScript code and then
# deploys only the addContactRelation function.
#
# Usage: ./deploy-contact-relation-function.sh
# Run this script from the FirebaseBackend directory
#############################################################

echo "Building and deploying addContactRelation function..."

# Build the TypeScript code
(cd functions && npm run build)

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Build successful, deploying function..."

  # Deploy only the addContactRelation function
  firebase deploy --only functions:addContactRelation

  # Check if deployment was successful
  if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
  else
    echo "❌ Function deployment failed."
    exit 1
  fi
else
  echo "❌ Build failed. Please fix the errors and try again."
  exit 1
fi
