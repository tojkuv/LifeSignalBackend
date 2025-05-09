/**
 * Tests for updateContactRoles function
 * 
 * This file contains tests for the updateContactRoles Cloud Function,
 * which updates the roles of an existing contact relationship.
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
import { updateContactRoles } from './updateContactRoles';

// Wrap the function for testing
const wrappedUpdateContactRoles = test.wrap(updateContactRoles);

describe('updateContactRoles', () => {
  // Test user IDs
  const userId = 'test-user-1';
  const contactUserId = 'test-user-2';
  
  // User reference paths
  const userRefPath = `users/${userId}`;
  const contactRefPath = `users/${contactUserId}`;
  
  // Setup before tests
  beforeEach(async () => {
    // Create test users with existing contact relationships
    const user1 = createMockUser(userId);
    const user2 = createMockUser(contactUserId);
    
    // Add contacts to each user
    user1.contacts = [
      createMockContact(contactRefPath, {
        isResponder: false,
        isDependent: true
      })
    ];
    
    user2.contacts = [
      createMockContact(userRefPath, {
        isResponder: true,
        isDependent: false
      })
    ];
    
    // Set up Firestore documents
    await setupFirestoreDoc(userRefPath, user1);
    await setupFirestoreDoc(contactRefPath, user2);
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
  test('should update contact roles when valid data is provided', async () => {
    // Test data - change roles
    const data = {
      userRefPath,
      contactRefPath,
      isResponder: true,
      isDependent: true
    };
    
    // Call the function with authenticated context
    const result = await wrappedUpdateContactRoles(data, mockAuth(userId));
    
    // Verify the result
    expect(result).toEqual({ success: true });
    
    // Verify the user document was updated
    const userDoc = await getFirestoreDoc(userRefPath);
    const userData = userDoc.data();
    
    expect(userData).toBeDefined();
    expect(userData?.contacts).toHaveLength(1);
    expect(userData?.contacts[0].referencePath).toBe(contactRefPath);
    expect(userData?.contacts[0].isResponder).toBe(true);
    expect(userData?.contacts[0].isDependent).toBe(true);
    
    // Verify the contact document was updated with reciprocal roles
    const contactDoc = await getFirestoreDoc(contactRefPath);
    const contactData = contactDoc.data();
    
    expect(contactData).toBeDefined();
    expect(contactData?.contacts).toHaveLength(1);
    expect(contactData?.contacts[0].referencePath).toBe(userRefPath);
    expect(contactData?.contacts[0].isResponder).toBe(true); // Reciprocal of isDependent
    expect(contactData?.contacts[0].isDependent).toBe(true); // Reciprocal of isResponder
  });
  
  test('should throw an error when user is not authenticated', async () => {
    // Test data
    const data = {
      userRefPath,
      contactRefPath,
      isResponder: true,
      isDependent: true
    };
    
    // Call the function with unauthenticated context
    await expect(wrappedUpdateContactRoles(data, { auth: null }))
      .rejects
      .toThrow('Authentication required.');
  });
  
  test('should throw an error when required parameters are missing', async () => {
    // Test with missing userRefPath
    await expect(wrappedUpdateContactRoles(
      { contactRefPath, isResponder: true, isDependent: true },
      mockAuth(userId)
    )).rejects.toThrow('Both user and contact references are required.');
    
    // Test with missing contactRefPath
    await expect(wrappedUpdateContactRoles(
      { userRefPath, isResponder: true, isDependent: true },
      mockAuth(userId)
    )).rejects.toThrow('Both user and contact references are required.');
    
    // Test with missing role parameters
    await expect(wrappedUpdateContactRoles(
      { userRefPath, contactRefPath, isResponder: true },
      mockAuth(userId)
    )).rejects.toThrow('Both isResponder and isDependent must be provided.');
  });
  
  test('should throw an error when contact relationship does not exist', async () => {
    // Create users without contacts
    await setupFirestoreDoc(userRefPath, createMockUser(userId));
    await setupFirestoreDoc(contactRefPath, createMockUser(contactUserId));
    
    // Test data
    const data = {
      userRefPath,
      contactRefPath,
      isResponder: true,
      isDependent: true
    };
    
    // Call the function
    await expect(wrappedUpdateContactRoles(data, mockAuth(userId)))
      .rejects
      .toThrow('Contact relationship not found.');
  });
});
