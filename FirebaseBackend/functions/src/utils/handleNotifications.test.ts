/**
 * Tests for handleNotifications utility function
 * 
 * This file contains tests for the handleNotifications utility function,
 * which is called by the sendCheckInReminders Cloud Function.
 */

import * as admin from 'firebase-admin';
import { cleanup } from '../../test/setup';
import { 
  setupFirestoreDoc, 
  deleteFirestoreDoc,
  mockTimestamp
} from '../../test/utils/test-helpers';
import { 
  createMockUser, 
  createMockContact 
} from '../../test/utils/mock-data';

// Import the function to test
import { handleNotifications } from './handleNotifications';

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
  
  // Clean up after all tests
  afterAll(() => {
    cleanup();
  });
  
  // Test cases
  test('should send notifications to responders when check-in has expired', async () => {
    // Create a timestamp for an expired check-in
    const now = new Date();
    const checkInInterval = 60 * 60; // 1 hour in seconds
    const lastCheckedIn = new Date(now.getTime() - (2 * 60 * 60 * 1000)); // 2 hours ago (expired)
    
    // Create test user with an expired check-in
    const user = createMockUser(userId, {
      name: 'Test User',
      checkInInterval,
      lastCheckedIn: admin.firestore.Timestamp.fromDate(lastCheckedIn),
      fcmToken: 'user-fcm-token'
    });
    
    // Create responder user
    const responder = createMockUser(responderUserId, {
      fcmToken: 'responder-fcm-token'
    });
    
    // Add responder to user's contacts
    user.contacts = [
      createMockContact(responderRefPath, {
        isResponder: true,
        isDependent: false
      })
    ];
    
    // Add user to responder's contacts
    responder.contacts = [
      createMockContact(userRefPath, {
        isResponder: false,
        isDependent: true
      })
    ];
    
    // Set up Firestore documents
    await setupFirestoreDoc(userRefPath, user);
    await setupFirestoreDoc(responderRefPath, responder);
    
    // Call the handleNotifications function
    await handleNotifications();
    
    // Verify that messaging.send was called with the correct parameters for the responder
    expect(messagingSpy).toHaveBeenCalledWith({
      token: 'responder-fcm-token',
      notification: {
        title: 'Emergency Alert',
        body: `${user.name}'s check-in has expired.`
      }
    });
  });
  
  test('should not send notifications when check-in has not expired', async () => {
    // Create a timestamp for a non-expired check-in
    const now = new Date();
    const checkInInterval = 60 * 60; // 1 hour in seconds
    const lastCheckedIn = new Date(now.getTime() - (30 * 60 * 1000)); // 30 minutes ago (not expired)
    
    // Create test user with a non-expired check-in
    const user = createMockUser(userId, {
      checkInInterval,
      lastCheckedIn: admin.firestore.Timestamp.fromDate(lastCheckedIn),
      fcmToken: 'user-fcm-token'
    });
    
    // Create responder user
    const responder = createMockUser(responderUserId, {
      fcmToken: 'responder-fcm-token'
    });
    
    // Add responder to user's contacts
    user.contacts = [
      createMockContact(responderRefPath, {
        isResponder: true,
        isDependent: false
      })
    ];
    
    // Set up Firestore documents
    await setupFirestoreDoc(userRefPath, user);
    await setupFirestoreDoc(responderRefPath, responder);
    
    // Call the handleNotifications function
    await handleNotifications();
    
    // Verify that messaging.send was not called for the responder
    expect(messagingSpy).not.toHaveBeenCalledWith(expect.objectContaining({
      token: 'responder-fcm-token',
      notification: expect.objectContaining({
        title: 'Emergency Alert'
      })
    }));
  });
  
  test('should handle users with no FCM token', async () => {
    // Create test user with no FCM token
    const user = createMockUser(userId, {
      fcmToken: undefined
    });
    
    // Set up Firestore document
    await setupFirestoreDoc(userRefPath, user);
    
    // Call the handleNotifications function
    await handleNotifications();
    
    // Verify that messaging.send was not called
    expect(messagingSpy).not.toHaveBeenCalled();
  });
});
