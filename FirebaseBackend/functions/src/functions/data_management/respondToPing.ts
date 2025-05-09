import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { ContactReference } from "../../models/interfaces";

/**
 * Cloud function to respond to a ping from a contact.
 *
 * This function:
 * 1. Takes a user reference and a contact reference
 * 2. Clears the incoming ping timestamp in the user's contact entry
 * 3. Clears the outgoing ping timestamp in the contact's entry for the user
 *
 * @function respondToPing
 * @param {Object} request - The function request object
 * @param {Object} request.data - The request data
 * @param {string} request.data.userRefPath - Firestore document path to the user
 * @param {string} request.data.contactRefPath - Firestore document path to the contact
 * @returns {Promise<{success: boolean}>} - Success status of the operation
 * @throws {HttpsError} - If authentication fails or if users cannot be found
 */
export const respondToPing = onCall(
    { cors: true },
    async (request) => {
      const { userRefPath, contactRefPath } = request.data as {
        userRefPath: string;
        contactRefPath: string;
      };

      console.log(`Received respond to ping request: userRefPath=${userRefPath}, contactRefPath=${contactRefPath}`);

      // Ensure user is authenticated
      if (!request.auth) {
        console.log("Authentication required - request rejected");
        throw new HttpsError("unauthenticated", "Authentication required.");
      }

      // Validate required parameters
      if (!userRefPath || !contactRefPath) {
        console.log("Missing required parameters - request rejected");
        throw new HttpsError("invalid-argument", "Both user and contact references are required.");
      }

      const db = admin.firestore();
      const userRef = db.doc(userRefPath);
      const contactRef = db.doc(contactRefPath);

      try {
        // Get both user documents
        const [userSnap, contactSnap] = await Promise.all([
          userRef.get(),
          contactRef.get(),
        ]);

        // Ensure both documents exist
        if (!userSnap.exists || !contactSnap.exists) {
          console.log("One or both users not found - request rejected");
          throw new HttpsError("not-found", "One or both users not found.");
        }

        const userData = userSnap.data() || {};
        const contactData = contactSnap.data() || {};

        // Ensure contacts arrays exist
        const userContacts = Array.isArray(userData.contacts) ? userData.contacts : [];
        const contactContacts = Array.isArray(contactData.contacts) ? contactData.contacts : [];

        // Find the contact in the user's contacts
        const userContactIndex = userContacts.findIndex(c => {
          const path = c.reference?.path || c.referencePath;
          return path === contactRef.path;
        });

        // Find the user in the contact's contacts
        const contactUserIndex = contactContacts.findIndex(c => {
          const path = c.reference?.path || c.referencePath;
          return path === userRef.path;
        });

        // If either relationship doesn't exist, throw an error
        if (userContactIndex === -1 || contactUserIndex === -1) {
          console.log("Contact relationship not found - request rejected");
          throw new HttpsError("not-found", "Contact relationship not found.");
        }

        // Get the current timestamp
        const now = admin.firestore.Timestamp.now();

        // Update the user's contact entry to clear the incoming ping
        const userContact = userContacts[userContactIndex] as ContactReference;
        userContact.incomingPingTimestamp = null;
        userContact.lastUpdated = now;
        userContacts[userContactIndex] = userContact;

        // Update the contact's entry for the user to clear the outgoing ping
        const contactUser = contactContacts[contactUserIndex] as ContactReference;
        contactUser.outgoingPingTimestamp = null;
        contactUser.lastUpdated = now;
        contactContacts[contactUserIndex] = contactUser;

        // Update both documents
        await Promise.all([
          userRef.update({ contacts: userContacts }),
          contactRef.update({ contacts: contactContacts }),
        ]);

        console.log("Successfully responded to ping");
        return { success: true };
      } catch (error) {
        console.error("Error responding to ping:", error);
        throw new HttpsError("internal", "Failed to respond to ping: " + error.message);
      }
    }
);
