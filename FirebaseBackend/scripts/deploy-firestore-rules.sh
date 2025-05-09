#!/bin/bash

#############################################################
# LifeSignal Firestore Rules Deployment Script
#
# This script deploys the Firestore security rules to Firebase.
# It verifies that the rules file exists before attempting deployment.
#
# Usage: ./scripts/deploy-firestore-rules.sh
# Run this script from the LifeSignalBackend/FirebaseBackend directory
#############################################################

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the parent directory (FirebaseBackend)
BASE_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to the base directory
cd "$BASE_DIR"
echo "Working directory: $(pwd)"

echo "Deploying Firestore security rules..."

# Check if firebase.rules exists
if [ ! -f "$BASE_DIR/firebase.rules" ]; then
  echo "❌ Error: firebase.rules file not found in the FirebaseBackend directory."
  echo "Make sure the rules file exists at: $BASE_DIR/firebase.rules"
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
