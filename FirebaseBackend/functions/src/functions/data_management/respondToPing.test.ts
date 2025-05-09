/**
 * Tests for respondToPing function
 * 
 * This file contains tests for the respondToPing Cloud Function,
 * which responds to a ping from a contact.
 */

import * as admin from 'firebase-admin';
import { test, cleanup } from '../../../test/setup';
import { 
  mockAuth, 
  setupFirestoreDoc, 
  deleteFirestoreDoc, 
  getFirestoreDoc,
  mockTimestamp
} from '../../../test/utils/test-helpers';
import { 
  createMockUser, 
  createMockContact 
} from '../../../test/utils/mock-data';

// Import the function to test
import { respondToPing } from './respondToPing';

// Wrap the function for testing
const wrappedRespondToPing = test.wrap(respondToPing);

describe('respondToPing', () => {
  // Test user IDs
  const userId = 'test-user-1';
  const contactUserId = 'test-user-2';
  
  // User reference paths
  const userRefPath = `users/${userId}`;
  const contactRefPath = `users/${contactUserId}`;
  
  // Setup before tests
  beforeEach(async () => {
    // Create test users with existing contact relationships
    const user = createMockUser(userId);
    const contact = createMockUser(contactUserId);
    
    // Create a timestamp for the ping
    const pingTimestamp = mockTimestamp();
    
    // Add contacts to each user with active pings
    user.contacts = [
      createMockContact(contactRefPath, {
        isResponder: true,
        isDependent: false,
        incomingPingTimestamp: pingTimestamp
      })
    ];
    
    contact.contacts = [
      createMockContact(userRefPath, {
        isResponder: false,
        isDependent: true,
        outgoingPingTimestamp: pingTimestamp
      })
    ];
    
    // Set up Firestore documents
    await setupFirestoreDoc(userRefPath, user);
    await setupFirestoreDoc(contactRefPath, contact);
  });
  
  // Clean up after tests
  afterEach(async () => {
    // Delete test documents
    await deleteFirestoreDoc(userRefPath);
    await deleteFirestoreDoc(contactRefPath);
  });
  
  // Clean up after all tests
  afterAll(() => {
    cleanup();
  });
  
  // Test cases
  test('should respond to a ping when valid data is provided', async () => {
    // Test data
    const data = {
      userRefPath,
      contactRefPath
    };
    
    // Call the function with authenticated context
    const result = await wrappedRespondToPing(data, mockAuth(userId));
    
    // Verify the result
    expect(result).toEqual({ success: true });
    
    // Verify the user document was updated with cleared incoming ping timestamp
    const userDoc = await getFirestoreDoc(userRefPath);
    const userData = userDoc.data();
    
    expect(userData).toBeDefined();
    expect(userData?.contacts).toHaveLength(1);
    expect(userData?.contacts[0].incomingPingTimestamp).toBeNull();
    
    // Verify the contact document was updated with cleared outgoing ping timestamp
    const contactDoc = await getFirestoreDoc(contactRefPath);
    const contactData = contactDoc.data();
    
    expect(contactData).toBeDefined();
    expect(contactData?.contacts).toHaveLength(1);
    expect(contactData?.contacts[0].outgoingPingTimestamp).toBeNull();
  });
  
  test('should throw an error when user is not authenticated', async () => {
    // Test data
    const data = {
      userRefPath,
      contactRefPath
    };
    
    // Call the function with unauthenticated context
    await expect(wrappedRespondToPing(data, { auth: null }))
      .rejects
      .toThrow('Authentication required.');
  });
  
  test('should throw an error when required parameters are missing', async () => {
    // Test with missing userRefPath
    await expect(wrappedRespondToPing(
      { contactRefPath },
      mockAuth(userId)
    )).rejects.toThrow('Both user and contact references are required.');
    
    // Test with missing contactRefPath
    await expect(wrappedRespondToPing(
      { userRefPath },
      mockAuth(userId)
    )).rejects.toThrow('Both user and contact references are required.');
  });
  
  test('should throw an error when contact relationship does not exist', async () => {
    // Create users without contacts
    await setupFirestoreDoc(userRefPath, createMockUser(userId));
    await setupFirestoreDoc(contactRefPath, createMockUser(contactUserId));
    
    // Test data
    const data = {
      userRefPath,
      contactRefPath
    };
    
    // Call the function
    await expect(wrappedRespondToPing(data, mockAuth(userId)))
      .rejects
      .toThrow('Contact relationship not found.');
  });
});
