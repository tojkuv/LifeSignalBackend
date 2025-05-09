/**
 * LifeSignal Firebase Cloud Functions
 *
 * This file imports and exports all Firebase Cloud Functions for the LifeSignal application.
 * Functions include:
 * - Scheduled check-in reminders and notifications
 * - Contact relationship management (adding, updating, and removing contacts)
 *
 * @module firebase-functions
 */

import { initializeApp } from "firebase-admin/app";

// Import functions
import { sendCheckInReminders } from "./functions/sendCheckInReminders";
import { addContactRelation } from "./functions/addContactRelation";
import { updateContactRelation } from "./functions/updateContactRelation";
import { deleteContactRelation } from "./functions/deleteContactRelation";

// Initialize Firebase Admin SDK
initializeApp();

// Export all functions
export {
  sendCheckInReminders,
  addContactRelation,
  updateContactRelation,
  deleteContactRelation
};