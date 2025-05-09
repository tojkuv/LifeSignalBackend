#!/bin/bash

#############################################################
# LifeSignal Complete Deployment Script
#
# This script deploys both Firestore security rules and the
# addContactRelation function to Firebase. It runs the individual
# deployment scripts in sequence.
#
# Usage: ./deploy-all.sh
# Run this script from the FirebaseBackend directory
#############################################################

echo "=== Deploying Firestore Rules and Contact Function ==="

# First, deploy the Firestore rules
echo "Step 1: Deploying Firestore security rules..."
./deploy-firestore-rules.sh

# Check if rules deployment was successful
if [ $? -ne 0 ]; then
  echo "❌ Firestore rules deployment failed. Stopping deployment process."
  exit 1
fi

echo "Step 2: Building and deploying addContactRelation function..."
./deploy-contact-relation-function.sh

# Check if function deployment was successful
if [ $? -ne 0 ]; then
  echo "❌ Function deployment failed."
  exit 1
fi

echo "✅ All deployments completed successfully!"
