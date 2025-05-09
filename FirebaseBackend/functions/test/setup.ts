/**
 * Test setup file for Firebase Functions tests
 * 
 * This file initializes the Firebase Functions Test SDK and provides
 * utility functions for testing Firebase Cloud Functions.
 */

import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test';

// Initialize the Firebase Functions Test SDK
const projectConfig = {
  projectId: 'lifesignal-test',
  databaseURL: 'https://lifesignal-test.firebaseio.com',
};

// Create the test environment
const test = functionsTest(projectConfig);

// Initialize admin SDK to use with the Firebase emulator
admin.initializeApp(projectConfig);

// Export the test environment and admin SDK
export { test, admin };

// Clean up function to be called after tests
export function cleanup() {
  test.cleanup();
}
