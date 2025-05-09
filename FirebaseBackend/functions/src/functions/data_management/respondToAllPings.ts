import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { ContactReference } from "../../models/interfaces";

/**
 * Cloud function to respond to all pending pings from contacts.
 *
 * This function:
 * 1. Takes a user reference
 * 2. Finds all contacts with incoming pings
 * 3. Clears all incoming ping timestamps in the user's contacts
 * 4. Does NOT clear the outgoing ping timestamps in the contacts' entries
 *
 * @function respondToAllPings
 * @param {Object} request - The function request object
 * @param {Object} request.data - The request data
 * @param {string} request.data.userRefPath - Firestore document path to the user
 * @returns {Promise<{success: boolean}>} - Success status of the operation
 * @throws {HttpsError} - If authentication fails or if user cannot be found
 */
export const respondToAllPings = onCall(
    { cors: true },
    async (request) => {
      const { userRefPath } = request.data as {
        userRefPath: string;
      };

      console.log(`Received respond to all pings request: userRefPath=${userRefPath}`);

      // Ensure user is authenticated
      if (!request.auth) {
        console.log("Authentication required - request rejected");
        throw new HttpsError("unauthenticated", "Authentication required.");
      }

      // Validate required parameters
      if (!userRefPath) {
        console.log("Missing required parameter - request rejected");
        throw new HttpsError("invalid-argument", "User reference is required.");
      }

      const db = admin.firestore();
      const userRef = db.doc(userRefPath);

      try {
        // Get the user document
        const userSnap = await userRef.get();

        // Ensure the user document exists
        if (!userSnap.exists) {
          console.log("User not found - request rejected");
          throw new HttpsError("not-found", "User not found.");
        }

        const userData = userSnap.data() || {};

        // Ensure contacts array exists
        const userContacts = Array.isArray(userData.contacts) ? userData.contacts : [];

        // Find all contacts with incoming pings
        const contactsWithPings = userContacts.filter(c => c.incomingPingTimestamp);

        if (contactsWithPings.length === 0) {
          console.log("No pending pings found");
          return { success: true };
        }

        console.log(`Found ${contactsWithPings.length} contacts with pending pings`);

        // Get the current timestamp
        const now = admin.firestore.Timestamp.now();

        // Update all contacts with incoming pings
        for (const contact of contactsWithPings) {
          const contactIndex = userContacts.findIndex(c => {
            const path1 = c.reference?.path || c.referencePath;
            const path2 = contact.reference?.path || contact.referencePath;
            return path1 === path2;
          });

          if (contactIndex !== -1) {
            userContacts[contactIndex].incomingPingTimestamp = null;
            userContacts[contactIndex].lastUpdated = now;
          }
        }

        // Update only the user document to clear incoming pings
        await userRef.update({ contacts: userContacts });

        console.log("Successfully responded to all pings");
        return { success: true };
      } catch (error) {
        console.error("Error responding to all pings:", error);
        throw new HttpsError("internal", "Failed to respond to all pings: " + error.message);
      }
    }
);
