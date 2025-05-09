/**
 * Test helpers for Firebase Functions tests
 * 
 * This file provides utility functions for testing Firebase Cloud Functions,
 * including mock data creation, Firestore document setup, and authentication helpers.
 */

import * as admin from 'firebase-admin';
import { test } from '../setup';

/**
 * Create a mock authenticated context for callable functions
 * 
 * @param {string} uid - User ID to use for authentication
 * @returns {Object} Mock auth object for callable functions
 */
export function mockAuth(uid: string) {
  return { auth: { uid } };
}

/**
 * Create a mock callable context with no authentication
 * 
 * @returns {Object} Mock context with no auth
 */
export function mockUnauthenticatedContext() {
  return { auth: null };
}

/**
 * Create a mock Firestore document with the given data
 * 
 * @param {string} path - Path to the document
 * @param {any} data - Document data
 * @returns {Promise<void>}
 */
export async function setupFirestoreDoc(path: string, data: any): Promise<void> {
  const db = admin.firestore();
  await db.doc(path).set(data);
}

/**
 * Delete a Firestore document
 * 
 * @param {string} path - Path to the document
 * @returns {Promise<void>}
 */
export async function deleteFirestoreDoc(path: string): Promise<void> {
  const db = admin.firestore();
  await db.doc(path).delete();
}

/**
 * Get a Firestore document
 * 
 * @param {string} path - Path to the document
 * @returns {Promise<FirebaseFirestore.DocumentSnapshot>}
 */
export async function getFirestoreDoc(path: string): Promise<FirebaseFirestore.DocumentSnapshot> {
  const db = admin.firestore();
  return await db.doc(path).get();
}

/**
 * Create a mock Timestamp
 * 
 * @param {Date} date - Date to convert to Timestamp
 * @returns {FirebaseFirestore.Timestamp}
 */
export function mockTimestamp(date: Date = new Date()): FirebaseFirestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(date);
}

/**
 * Wait for a specified time
 * 
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
