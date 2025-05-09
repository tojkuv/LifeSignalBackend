import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Cloud function to remove a bidirectional contact relationship between two users.
 *
 * This function:
 * 1. Takes references to two user documents
 * 2. Removes each user from the other's contacts list
 * 3. Handles the cleanup of both sides of the relationship
 *
 * @function deleteContactRelation
 * @param {Object} request - The function request object
 * @param {Object} request.data - The request data
 * @param {string} request.data.userARefPath - Firestore document path to the first user
 * @param {string} request.data.userBRefPath - Firestore document path to the second user
 * @returns {Promise<{success: boolean}>} - Success status of the operation
 * @throws {HttpsError} - If authentication fails or if users cannot be found
 */
export const deleteContactRelation = onCall(
    { cors: true },
    async (request) => {
      const { userARefPath, userBRefPath } = request.data as {
        userARefPath: string;
        userBRefPath: string;
      };

      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
      }

      if (!userARefPath || !userBRefPath) {
        throw new HttpsError("invalid-argument", "Both user references are required.");
      }

      const db = admin.firestore();
      const userARef = db.doc(userARefPath);
      const userBRef = db.doc(userBRefPath);

      try {
        const [aSnap, bSnap] = await Promise.all([userARef.get(), userBRef.get()]);
        if (!aSnap.exists || !bSnap.exists) {
          throw new HttpsError("not-found", "One or both users not found.");
        }

        /**
         * Helper function to filter out a specific contact from a contacts array
         *
         * @param {any} raw - The raw contacts array from Firestore
         * @param {string} targetPath - The document path to filter out
         * @returns {Array} - Filtered contacts array without the target contact
         */
        const updateContacts = (raw: any, targetPath: string) =>
            (Array.isArray(raw) ? raw : []).filter((entry) => {
              const ref = entry.reference ?? entry.contact;
              return ref !== targetPath && ref?.path !== targetPath;
            });

        const aData = aSnap.data() || {};
        const bData = bSnap.data() || {};

        const aUpdated = updateContacts(aData.contacts, userBRef.path);
        const bUpdated = updateContacts(bData.contacts, userARef.path);

        await Promise.all([
          userARef.update({ contacts: aUpdated }),
          userBRef.update({ contacts: bUpdated }),
        ]);

        return { success: true };
      } catch (error) {
        console.error("Error deleting contact relation:", error);
        throw new HttpsError("internal", "Failed to delete contact relation.");
      }
    }
);
