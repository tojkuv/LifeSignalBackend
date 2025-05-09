#!/bin/bash

#############################################################
# LifeSignal Firebase Functions Test Script
#
# This script runs tests for Firebase Cloud Functions using Jest.
# It starts the Firebase emulators, runs the tests, and then
# stops the emulators.
#
# Usage: ./scripts/run-tests.sh [--coverage]
# Run this script from the LifeSignalBackend/FirebaseBackend directory
#############################################################

echo "=== LifeSignal Firebase Functions Test Script ==="

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the parent directory (FirebaseBackend)
BASE_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to the base directory
cd "$BASE_DIR"
echo "Working directory: $(pwd)"

# Navigate to the functions directory
cd "$BASE_DIR/functions"
echo "Functions directory: $(pwd)"

# Install dependencies if needed
echo "Installing dependencies..."
npm install

# Build the functions
echo "Building functions..."
npm run build

# Start the Firebase emulators in the background
echo "Starting Firebase emulators..."
firebase emulators:start --only firestore,functions &
EMULATOR_PID=$!

# Wait for emulators to start
echo "Waiting for emulators to start..."
sleep 10

# Run the tests
echo "Running tests..."
if [[ "$1" == "--coverage" ]]; then
  npm run test:coverage

  # Display coverage summary
  echo ""
  echo "Coverage Summary:"
  cat coverage/lcov-report/index.html | grep -A 5 "<div class=\"clearfix\">"
  echo ""
  echo "Full coverage report available at: coverage/lcov-report/index.html"
else
  npm test
fi

# Store the test result
TEST_RESULT=$?

# Stop the emulators
echo "Stopping emulators..."
kill $EMULATOR_PID

# Wait for emulators to stop
sleep 2

# Return the test result
if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Tests failed with exit code $TEST_RESULT"
fi

exit $TEST_RESULT
