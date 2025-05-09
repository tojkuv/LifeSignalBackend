/**
 * Mock data for Firebase Functions tests
 * 
 * This file provides mock data for testing Firebase Cloud Functions,
 * including user profiles, contacts, and QR codes.
 */

import * as admin from 'firebase-admin';
import { UserProfile, ContactReference } from '../../src/models/interfaces';

/**
 * Create a mock user profile
 * 
 * @param {string} id - User ID
 * @param {Partial<UserProfile>} overrides - Optional overrides for user data
 * @returns {UserProfile} Mock user profile
 */
export function createMockUser(id: string, overrides: Partial<UserProfile> = {}): UserProfile & { id: string } {
  const now = admin.firestore.Timestamp.now();
  
  // Create default user profile
  const defaultUser: UserProfile & { id: string } = {
    id,
    name: `Test User ${id}`,
    phone: "+16505553434",
    note: "Test user profile",
    checkInInterval: 24 * 60 * 60, // 24 hours in seconds
    lastCheckedIn: now,
    expirationTimestamp: admin.firestore.Timestamp.fromMillis(now.toMillis() + (24 * 60 * 60 * 1000)),
    contacts: [],
    fcmToken: "test-fcm-token",
    notify30MinBefore: true,
    notify2HoursBefore: true
  };
  
  // Return merged user with overrides
  return { ...defaultUser, ...overrides };
}

/**
 * Create a mock contact reference
 * 
 * @param {string} referencePath - Path to the contact's user document
 * @param {Partial<ContactReference>} overrides - Optional overrides for contact data
 * @returns {ContactReference} Mock contact reference
 */
export function createMockContact(
  referencePath: string,
  overrides: Partial<ContactReference> = {}
): ContactReference {
  const now = admin.firestore.Timestamp.now();
  
  // Create default contact reference
  const defaultContact: ContactReference = {
    referencePath,
    isResponder: false,
    isDependent: false,
    sendPings: true,
    receivePings: true,
    notifyOnCheckIn: false,
    notifyOnExpiry: false,
    nickname: "Test Contact",
    notes: "Test contact notes",
    lastUpdated: now,
    manualAlertActive: false,
    incomingPingTimestamp: null,
    outgoingPingTimestamp: null
  };
  
  // Return merged contact with overrides
  return { ...defaultContact, ...overrides };
}

/**
 * Create a mock QR lookup document
 * 
 * @param {string} qrCode - QR code string
 * @param {string} userId - User ID associated with the QR code
 * @returns {Object} Mock QR lookup document
 */
export function createMockQRLookup(qrCode: string, userId: string): { userId: string } {
  return { userId };
}

/**
 * Generate a random QR code
 * 
 * @returns {string} Random QR code
 */
export function generateRandomQRCode(): string {
  return Math.random().toString(36).substring(2, 15);
}
