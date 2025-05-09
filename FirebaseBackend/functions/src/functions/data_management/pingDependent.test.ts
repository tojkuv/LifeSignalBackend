/**
 * Tests for pingDependent function
 * 
 * This file contains tests for the pingDependent Cloud Function,
 * which sends a ping to a dependent contact.
 */

import * as admin from 'firebase-admin';
import { test, cleanup } from '../../../test/setup';
import { 
  mockAuth, 
  setupFirestoreDoc, 
  deleteFirestoreDoc, 
  getFirestoreDoc 
} from '../../../test/utils/test-helpers';
import { 
  createMockUser, 
  createMockContact 
} from '../../../test/utils/mock-data';

// Import the function to test
import { pingDependent } from './pingDependent';

// Wrap the function for testing
const wrappedPingDependent = test.wrap(pingDependent);

describe('pingDependent', () => {
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
    
    // Add contacts to each user
    user.contacts = [
      createMockContact(contactRefPath, {
        isResponder: false,
        isDependent: true,
        sendPings: true,
        receivePings: true
      })
    ];
    
    contact.contacts = [
      createMockContact(userRefPath, {
        isResponder: true,
        isDependent: false,
        sendPings: true,
        receivePings: true
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
  test('should send a ping to a dependent contact', async () => {
    // Test data
    const data = {
      userRefPath,
      contactRefPath
    };
    
    // Call the function with authenticated context
    const result = await wrappedPingDependent(data, mockAuth(userId));
    
    // Verify the result
    expect(result).toEqual({ success: true });
    
    // Verify the user document was updated with outgoing ping timestamp
    const userDoc = await getFirestoreDoc(userRefPath);
    const userData = userDoc.data();
    
    expect(userData).toBeDefined();
    expect(userData?.contacts).toHaveLength(1);
    expect(userData?.contacts[0].outgoingPingTimestamp).toBeDefined();
    expect(userData?.contacts[0].outgoingPingTimestamp).not.toBeNull();
    
    // Verify the contact document was updated with incoming ping timestamp
    const contactDoc = await getFirestoreDoc(contactRefPath);
    const contactData = contactDoc.data();
    
    expect(contactData).toBeDefined();
    expect(contactData?.contacts).toHaveLength(1);
    expect(contactData?.contacts[0].incomingPingTimestamp).toBeDefined();
    expect(contactData?.contacts[0].incomingPingTimestamp).not.toBeNull();
  });
  
  test('should throw an error when user is not authenticated', async () => {
    // Test data
    const data = {
      userRefPath,
      contactRefPath
    };
    
    // Call the function with unauthenticated context
    await expect(wrappedPingDependent(data, { auth: null }))
      .rejects
      .toThrow('Authentication required.');
  });
  
  test('should throw an error when required parameters are missing', async () => {
    // Test with missing userRefPath
    await expect(wrappedPingDependent(
      { contactRefPath },
      mockAuth(userId)
    )).rejects.toThrow('Both user and contact references are required.');
    
    // Test with missing contactRefPath
    await expect(wrappedPingDependent(
      { userRefPath },
      mockAuth(userId)
    )).rejects.toThrow('Both user and contact references are required.');
  });
  
  test('should throw an error when contact is not a dependent', async () => {
    // Create users with contact that is not a dependent
    const user = createMockUser(userId);
    const contact = createMockUser(contactUserId);
    
    user.contacts = [
      createMockContact(contactRefPath, {
        isResponder: true,
        isDependent: false // Not a dependent
      })
    ];
    
    contact.contacts = [
      createMockContact(userRefPath, {
        isResponder: false,
        isDependent: true
      })
    ];
    
    await setupFirestoreDoc(userRefPath, user);
    await setupFirestoreDoc(contactRefPath, contact);
    
    // Test data
    const data = {
      userRefPath,
      contactRefPath
    };
    
    // Call the function
    await expect(wrappedPingDependent(data, mockAuth(userId)))
      .rejects
      .toThrow('This contact is not a dependent.');
  });
});
