/**
 * Tests for deleteContactRelation function
 * 
 * This file contains tests for the deleteContactRelation Cloud Function,
 * which removes a bidirectional contact relationship between two users.
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
import { deleteContactRelation } from './deleteContactRelation';

// Wrap the function for testing
const wrappedDeleteContactRelation = test.wrap(deleteContactRelation);

describe('deleteContactRelation', () => {
  // Test user IDs
  const userAId = 'test-user-1';
  const userBId = 'test-user-2';
  
  // User reference paths
  const userARefPath = `users/${userAId}`;
  const userBRefPath = `users/${userBId}`;
  
  // Setup before tests
  beforeEach(async () => {
    // Create test users with existing contact relationships
    const userA = createMockUser(userAId);
    const userB = createMockUser(userBId);
    
    // Add contacts to each user
    userA.contacts = [
      createMockContact(userBRefPath, {
        isResponder: true,
        isDependent: false
      })
    ];
    
    userB.contacts = [
      createMockContact(userARefPath, {
        isResponder: false,
        isDependent: true
      })
    ];
    
    // Set up Firestore documents
    await setupFirestoreDoc(userARefPath, userA);
    await setupFirestoreDoc(userBRefPath, userB);
  });
  
  // Clean up after tests
  afterEach(async () => {
    // Delete test documents
    await deleteFirestoreDoc(userARefPath);
    await deleteFirestoreDoc(userBRefPath);
  });
  
  // Clean up after all tests
  afterAll(() => {
    cleanup();
  });
  
  // Test cases
  test('should delete contact relationship when valid data is provided', async () => {
    // Test data
    const data = {
      userARefPath,
      userBRefPath
    };
    
    // Call the function with authenticated context
    const result = await wrappedDeleteContactRelation(data, mockAuth(userAId));
    
    // Verify the result
    expect(result).toEqual({ success: true });
    
    // Verify the user A document was updated
    const userADoc = await getFirestoreDoc(userARefPath);
    const userAData = userADoc.data();
    
    expect(userAData).toBeDefined();
    expect(userAData?.contacts).toHaveLength(0);
    
    // Verify the user B document was updated
    const userBDoc = await getFirestoreDoc(userBRefPath);
    const userBData = userBDoc.data();
    
    expect(userBData).toBeDefined();
    expect(userBData?.contacts).toHaveLength(0);
  });
  
  test('should throw an error when user is not authenticated', async () => {
    // Test data
    const data = {
      userARefPath,
      userBRefPath
    };
    
    // Call the function with unauthenticated context
    await expect(wrappedDeleteContactRelation(data, { auth: null }))
      .rejects
      .toThrow('Authentication required.');
  });
  
  test('should throw an error when required parameters are missing', async () => {
    // Test with missing userARefPath
    await expect(wrappedDeleteContactRelation(
      { userBRefPath },
      mockAuth(userAId)
    )).rejects.toThrow('Both user references are required.');
    
    // Test with missing userBRefPath
    await expect(wrappedDeleteContactRelation(
      { userARefPath },
      mockAuth(userAId)
    )).rejects.toThrow('Both user references are required.');
  });
});
