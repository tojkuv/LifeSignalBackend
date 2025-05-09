/**
 * Tests for respondToAllPings function
 * 
 * This file contains tests for the respondToAllPings Cloud Function,
 * which responds to all pending pings from contacts.
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
import { respondToAllPings } from './respondToAllPings';

// Wrap the function for testing
const wrappedRespondToAllPings = test.wrap(respondToAllPings);

describe('respondToAllPings', () => {
  // Test user IDs
  const userId = 'test-user-1';
  const contact1UserId = 'test-user-2';
  const contact2UserId = 'test-user-3';
  
  // User reference paths
  const userRefPath = `users/${userId}`;
  const contact1RefPath = `users/${contact1UserId}`;
  const contact2RefPath = `users/${contact2UserId}`;
  
  // Setup before tests
  beforeEach(async () => {
    // Create test users with existing contact relationships
    const user = createMockUser(userId);
    const contact1 = createMockUser(contact1UserId);
    const contact2 = createMockUser(contact2UserId);
    
    // Create a timestamp for the ping
    const pingTimestamp = mockTimestamp();
    
    // Add contacts to the user with active pings
    user.contacts = [
      createMockContact(contact1RefPath, {
        isResponder: true,
        isDependent: false,
        incomingPingTimestamp: pingTimestamp
      }),
      createMockContact(contact2RefPath, {
        isResponder: true,
        isDependent: false,
        incomingPingTimestamp: pingTimestamp
      })
    ];
    
    // Add the user to each contact's contacts
    contact1.contacts = [
      createMockContact(userRefPath, {
        isResponder: false,
        isDependent: true,
        outgoingPingTimestamp: pingTimestamp
      })
    ];
    
    contact2.contacts = [
      createMockContact(userRefPath, {
        isResponder: false,
        isDependent: true,
        outgoingPingTimestamp: pingTimestamp
      })
    ];
    
    // Set up Firestore documents
    await setupFirestoreDoc(userRefPath, user);
    await setupFirestoreDoc(contact1RefPath, contact1);
    await setupFirestoreDoc(contact2RefPath, contact2);
  });
  
  // Clean up after tests
  afterEach(async () => {
    // Delete test documents
    await deleteFirestoreDoc(userRefPath);
    await deleteFirestoreDoc(contact1RefPath);
    await deleteFirestoreDoc(contact2RefPath);
  });
  
  // Clean up after all tests
  afterAll(() => {
    cleanup();
  });
  
  // Test cases
  test('should respond to all pings when valid data is provided', async () => {
    // Test data
    const data = {
      userRefPath
    };
    
    // Call the function with authenticated context
    const result = await wrappedRespondToAllPings(data, mockAuth(userId));
    
    // Verify the result
    expect(result).toEqual({ success: true });
    
    // Verify the user document was updated with cleared incoming ping timestamps
    const userDoc = await getFirestoreDoc(userRefPath);
    const userData = userDoc.data();
    
    expect(userData).toBeDefined();
    expect(userData?.contacts).toHaveLength(2);
    expect(userData?.contacts[0].incomingPingTimestamp).toBeNull();
    expect(userData?.contacts[1].incomingPingTimestamp).toBeNull();
    
    // Verify the contact documents were NOT updated (outgoing pings should remain)
    const contact1Doc = await getFirestoreDoc(contact1RefPath);
    const contact1Data = contact1Doc.data();
    
    expect(contact1Data).toBeDefined();
    expect(contact1Data?.contacts).toHaveLength(1);
    expect(contact1Data?.contacts[0].outgoingPingTimestamp).not.toBeNull();
    
    const contact2Doc = await getFirestoreDoc(contact2RefPath);
    const contact2Data = contact2Doc.data();
    
    expect(contact2Data).toBeDefined();
    expect(contact2Data?.contacts).toHaveLength(1);
    expect(contact2Data?.contacts[0].outgoingPingTimestamp).not.toBeNull();
  });
  
  test('should throw an error when user is not authenticated', async () => {
    // Test data
    const data = {
      userRefPath
    };
    
    // Call the function with unauthenticated context
    await expect(wrappedRespondToAllPings(data, { auth: null }))
      .rejects
      .toThrow('Authentication required.');
  });
  
  test('should throw an error when required parameters are missing', async () => {
    // Test with missing userRefPath
    await expect(wrappedRespondToAllPings(
      {},
      mockAuth(userId)
    )).rejects.toThrow('User reference is required.');
  });
  
  test('should succeed when user has no contacts with pings', async () => {
    // Create user with contacts but no pings
    const user = createMockUser(userId);
    user.contacts = [
      createMockContact(contact1RefPath, {
        isResponder: true,
        isDependent: false,
        incomingPingTimestamp: null
      }),
      createMockContact(contact2RefPath, {
        isResponder: true,
        isDependent: false,
        incomingPingTimestamp: null
      })
    ];
    
    await setupFirestoreDoc(userRefPath, user);
    
    // Test data
    const data = {
      userRefPath
    };
    
    // Call the function
    const result = await wrappedRespondToAllPings(data, mockAuth(userId));
    
    // Verify the result
    expect(result).toEqual({ success: true });
  });
});
