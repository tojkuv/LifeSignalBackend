/**
 * LifeSignal Firebase Cloud Functions
 *
 * This file imports and exports all Firebase Cloud Functions for the LifeSignal application.
 * Functions include:
 * - Scheduled check-in reminders and notifications
 * - Contact relationship management (adding, updating, and removing contacts)
 * - Ping management (sending, responding to, and clearing pings)
 *
 * @module firebase-functions
 */

import { initializeApp } from "firebase-admin/app";

// Import functions
import { addContactRelation } from "./functions/data_management/addContactRelation";
import { updateContactRoles } from "./functions/data_management/updateContactRoles";
import { deleteContactRelation } from "./functions/data_management/deleteContactRelation";

// Import ping-related functions
import { respondToPing } from "./functions/data_management/respondToPing";
import { respondToAllPings } from "./functions/data_management/respondToAllPings";
import { pingDependent } from "./functions/data_management/pingDependent";
import { clearPing } from "./functions/data_management/clearPing";

// Initialize Firebase Admin SDK
initializeApp();

// Export all functions
export {
  // Contact management functions
  addContactRelation,
  updateContactRoles,
  deleteContactRelation,

  // Ping management functions
  respondToPing,
  respondToAllPings,
  pingDependent,
  clearPing
};