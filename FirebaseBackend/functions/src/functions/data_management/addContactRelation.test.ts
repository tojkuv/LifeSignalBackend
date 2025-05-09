/**
 * Tests for addContactRelation function
 * 
 * This file contains tests for the addContactRelation Cloud Function,
 * which creates a bidirectional contact relationship between two users.
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
  createMockQRLookup, 
  generateRandomQRCode 
} from '../../../test/utils/mock-data';

// Import the function to test
import { addContactRelation } from './addContactRelation';

// Wrap the function for testing
const wrappedAddContactRelation = test.wrap(addContactRelation);

describe('addContactRelation', () => {
  // Test user IDs
  const userId = 'test-user-1';
  const contactUserId = 'test-user-2';
  
  // Test QR code
  const qrCode = generateRandomQRCode();
  
  // Setup before tests
  beforeAll(async () => {
    // Create test users in Firestore
    const user1 = createMockUser(userId);
    const user2 = createMockUser(contactUserId);
    
    // Create QR lookup document
    const qrLookup = createMockQRLookup(qrCode, contactUserId);
    
    // Set up Firestore documents
    await setupFirestoreDoc(`users/${userId}`, user1);
    await setupFirestoreDoc(`users/${contactUserId}`, user2);
    await setupFirestoreDoc(`qr_lookup/${qrCode}`, qrLookup);
  });
  
  // Clean up after tests
  afterAll(async () => {
    // Delete test documents
    await deleteFirestoreDoc(`users/${userId}`);
    await deleteFirestoreDoc(`users/${contactUserId}`);
    await deleteFirestoreDoc(`qr_lookup/${qrCode}`);
    
    // Clean up test environment
    cleanup();
  });
  
  // Test cases
  test('should add a contact relationship when valid data is provided', async () => {
    // Test data
    const data = {
      userId,
      qrCode,
      isResponder: true,
      isDependent: false
    };
    
    // Call the function with authenticated context
    const result = await wrappedAddContactRelation(data, mockAuth(userId));
    
    // Verify the result
    expect(result).toEqual({
      success: true,
      contactId: contactUserId
    });
    
    // Verify the user document was updated
    const userDoc = await getFirestoreDoc(`users/${userId}`);
    const userData = userDoc.data();
    
    expect(userData).toBeDefined();
    expect(userData?.contacts).toHaveLength(1);
    expect(userData?.contacts[0].referencePath).toBe(`users/${contactUserId}`);
    expect(userData?.contacts[0].isResponder).toBe(true);
    expect(userData?.contacts[0].isDependent).toBe(false);
    
    // Verify the contact document was updated
    const contactDoc = await getFirestoreDoc(`users/${contactUserId}`);
    const contactData = contactDoc.data();
    
    expect(contactData).toBeDefined();
    expect(contactData?.contacts).toHaveLength(1);
    expect(contactData?.contacts[0].referencePath).toBe(`users/${userId}`);
    expect(contactData?.contacts[0].isResponder).toBe(false);
    expect(contactData?.contacts[0].isDependent).toBe(true);
  });
  
  test('should throw an error when user is not authenticated', async () => {
    // Test data
    const data = {
      userId,
      qrCode,
      isResponder: true,
      isDependent: false
    };
    
    // Call the function with unauthenticated context
    await expect(wrappedAddContactRelation(data, { auth: null }))
      .rejects
      .toThrow('Authentication required.');
  });
  
  test('should throw an error when required parameters are missing', async () => {
    // Test with missing userId
    await expect(wrappedAddContactRelation(
      { qrCode, isResponder: true, isDependent: false },
      mockAuth(userId)
    )).rejects.toThrow('User ID and QR code are required.');
    
    // Test with missing qrCode
    await expect(wrappedAddContactRelation(
      { userId, isResponder: true, isDependent: false },
      mockAuth(userId)
    )).rejects.toThrow('User ID and QR code are required.');
  });
  
  test('should throw an error when QR code is invalid', async () => {
    // Test with invalid QR code
    await expect(wrappedAddContactRelation(
      { userId, qrCode: 'invalid-qr-code', isResponder: true, isDependent: false },
      mockAuth(userId)
    )).rejects.toThrow('No user found with the provided QR code.');
  });
});
