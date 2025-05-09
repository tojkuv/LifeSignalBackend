/**
 * Tests for sendCheckInReminders function
 * 
 * This file contains tests for the sendCheckInReminders Cloud Function,
 * which sends check-in reminders and notifications to users and their responders.
 */

import * as admin from 'firebase-admin';
import { test, cleanup } from '../../../test/setup';
import { 
  setupFirestoreDoc, 
  deleteFirestoreDoc,
  mockTimestamp
} from '../../../test/utils/test-helpers';
import { 
  createMockUser, 
  createMockContact 
} from '../../../test/utils/mock-data';

// Import the function to test
import { sendCheckInReminders } from './sendCheckInReminders';
import * as notificationUtils from '../../utils/handleNotifications';

// Wrap the function for testing
const wrappedSendCheckInReminders = test.wrap(sendCheckInReminders);

describe('sendCheckInReminders', () => {
  // Spy on the handleNotifications function
  let handleNotificationsSpy: jest.SpyInstance;
  
  // Setup before tests
  beforeEach(() => {
    // Mock the handleNotifications function
    handleNotificationsSpy = jest.spyOn(notificationUtils, 'handleNotifications')
      .mockImplementation(async () => {
        // Mock implementation that does nothing
        return Promise.resolve();
      });
  });
  
  // Clean up after tests
  afterEach(() => {
    // Restore the original implementation
    handleNotificationsSpy.mockRestore();
  });
  
  // Clean up after all tests
  afterAll(() => {
    cleanup();
  });
  
  // Test cases
  test('should call handleNotifications when triggered', async () => {
    // Trigger the function
    await wrappedSendCheckInReminders();
    
    // Verify that handleNotifications was called
    expect(handleNotificationsSpy).toHaveBeenCalledTimes(1);
  });
});

/**
 * Tests for handleNotifications function
 * 
 * This file also contains tests for the handleNotifications utility function,
 * which is called by the sendCheckInReminders Cloud Function.
 */
describe('handleNotifications', () => {
  // Test user IDs
  const userId = 'test-user-1';
  const responderUserId = 'test-user-2';
  
  // User reference paths
  const userRefPath = `users/${userId}`;
  const responderRefPath = `users/${responderUserId}`;
  
  // Mock the messaging service
  let messagingSpy: jest.SpyInstance;
  
  // Setup before tests
  beforeEach(() => {
    // Mock the messaging.send method
    messagingSpy = jest.spyOn(admin.messaging(), 'send')
      .mockImplementation(async () => {
        // Mock implementation that returns a message ID
        return 'mock-message-id';
      });
  });
  
  // Clean up after tests
  afterEach(async () => {
    // Delete test documents
    await deleteFirestoreDoc(userRefPath);
    await deleteFirestoreDoc(responderRefPath);
    
    // Restore the original implementation
    messagingSpy.mockRestore();
  });
  
  // Test cases
  test('should send 2-hour reminder when appropriate', async () => {
    // Create a timestamp for 1.95 hours before expiry
    const now = new Date();
    const checkInInterval = 2 * 60 * 60; // 2 hours in seconds
    const lastCheckedIn = new Date(now.getTime() - (0.05 * 60 * 60 * 1000)); // 0.05 hours ago
    
    // Create test user with 2-hour notification enabled
    const user = createMockUser(userId, {
      checkInInterval,
      lastCheckedIn: admin.firestore.Timestamp.fromDate(lastCheckedIn),
      notify2HoursBefore: true,
      notify30MinBefore: false,
      fcmToken: 'test-fcm-token'
    });
    
    // Set up Firestore document
    await setupFirestoreDoc(userRefPath, user);
    
    // Call the handleNotifications function directly
    await notificationUtils.handleNotifications();
    
    // Verify that messaging.send was called with the correct parameters
    expect(messagingSpy).toHaveBeenCalledWith({
      token: 'test-fcm-token',
      notification: {
        title: 'Check-in Reminder',
        body: 'Your check-in expires in 2 hours'
      }
    });
  });
  
  test('should send 30-minute reminder when appropriate', async () => {
    // Create a timestamp for 29.5 minutes before expiry
    const now = new Date();
    const checkInInterval = 30 * 60; // 30 minutes in seconds
    const lastCheckedIn = new Date(now.getTime() - (0.5 * 60 * 1000)); // 0.5 minutes ago
    
    // Create test user with 30-minute notification enabled
    const user = createMockUser(userId, {
      checkInInterval,
      lastCheckedIn: admin.firestore.Timestamp.fromDate(lastCheckedIn),
      notify2HoursBefore: false,
      notify30MinBefore: true,
      fcmToken: 'test-fcm-token'
    });
    
    // Set up Firestore document
    await setupFirestoreDoc(userRefPath, user);
    
    // Call the handleNotifications function directly
    await notificationUtils.handleNotifications();
    
    // Verify that messaging.send was called with the correct parameters
    expect(messagingSpy).toHaveBeenCalledWith({
      token: 'test-fcm-token',
      notification: {
        title: 'Check-in Reminder',
        body: 'Your check-in expires in 30 minutes'
      }
    });
  });
});
