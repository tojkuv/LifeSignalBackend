#!/bin/bash

#############################################################
# LifeSignal Complete Deployment Script
#
# This script deploys Firestore security rules and all Firebase
# functions to Firebase. It handles the deployment of:
# - Firestore security rules
# - All Cloud Functions (addContactRelation, updateContactRelation,
#   deleteContactRelation, sendCheckInReminders)
#
# Usage: ./deploy-all.sh
# Run this script from the FirebaseBackend directory
#############################################################

echo "=== LifeSignal Firebase Deployment Script ==="

# First, deploy the Firestore rules
echo "Step 1: Deploying Firestore security rules..."
./deploy-firestore-rules.sh

# Check if rules deployment was successful
if [ $? -ne 0 ]; then
  echo "❌ Firestore rules deployment failed. Stopping deployment process."
  exit 1
fi

echo "Step 2: Building and deploying all Firebase functions..."

# Navigate to the functions directory
cd functions

# Install dependencies if needed
echo "Installing dependencies..."
npm install

# Clean the build directory to ensure a fresh build
echo "Cleaning build directory..."
rm -rf lib/

# Build the functions
echo "Building functions..."
npm run build

# Verify the build was successful
if [ $? -ne 0 ]; then
  echo "❌ Function build failed."
  exit 1
fi

# Deploy all functions
echo "Deploying all functions to Firebase..."
firebase deploy --only functions

# Check if function deployment was successful
if [ $? -ne 0 ]; then
  echo "❌ Function deployment failed."
  exit 1
fi

# Return to the original directory
cd ..

echo "✅ All deployments completed successfully!"
echo "The following functions have been deployed:"
echo "  - addContactRelation"
echo "  - updateContactRelation"
echo "  - deleteContactRelation"
echo "  - sendCheckInReminders"
