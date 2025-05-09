#!/bin/bash

#############################################################
# LifeSignal Firestore Rules Deployment Script
#
# This script deploys the Firestore security rules to Firebase.
# It verifies that the rules file exists before attempting deployment.
#
# Usage: ./deploy-firestore-rules.sh
# Run this script from the FirebaseBackend directory
#############################################################

echo "Deploying Firestore security rules..."

# Check if firebase.rules exists
if [ ! -f "firebase.rules" ]; then
  echo "❌ Error: firebase.rules file not found in the current directory."
  echo "Make sure you're running this script from the FirebaseBackend directory."
  exit 1
fi

# Deploy only the Firestore rules
firebase deploy --only firestore:rules

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo "✅ Firestore rules deployed successfully!"
else
  echo "❌ Firestore rules deployment failed."
  exit 1
fi
