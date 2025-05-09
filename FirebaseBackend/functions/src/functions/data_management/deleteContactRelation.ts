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

      console.log(`Received delete request for: userA=${userARefPath}, userB=${userBRefPath}`);

      if (!request.auth) {
        console.log("Authentication required - request rejected");
        throw new HttpsError("unauthenticated", "Authentication required.");
      }

      if (!userARefPath || !userBRefPath) {
        console.log("Missing user references - request rejected");
        throw new HttpsError("invalid-argument", "Both user references are required.");
      }

      const db = admin.firestore();
      const userARef = db.doc(userARefPath);
      const userBRef = db.doc(userBRefPath);

      console.log(`Processing document references: ${userARef.path} and ${userBRef.path}`);

      try {
        console.log(`Fetching documents for: ${userARef.path} and ${userBRef.path}`);
        const [aSnap, bSnap] = await Promise.all([userARef.get(), userBRef.get()]);

        if (!aSnap.exists) {
          console.log(`User A document not found: ${userARef.path}`);
        }
        if (!bSnap.exists) {
          console.log(`User B document not found: ${userBRef.path}`);
        }

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
        const updateContacts = (raw: any, targetPath: string) => {
          console.log(`Filtering contacts array with ${raw?.length || 0} items to remove ${targetPath}`);

          if (!Array.isArray(raw)) {
            console.log(`Contacts is not an array, returning empty array`);
            return [];
          }

          return raw.filter((entry) => {
            // Log the entry for debugging
            console.log(`Processing contact entry: ${JSON.stringify(entry)}`);

            // Check all possible reference field names
            const ref = entry.reference ?? entry.contact ?? entry.referencePath;
            console.log(`Found reference value: ${ref}, type: ${typeof ref}`);

            // If ref is a string (path), compare directly
            if (typeof ref === 'string') {
              const matches = ref === targetPath;
              console.log(`String comparison: ${ref} === ${targetPath} = ${matches}`);
              return !matches;
            }

            // If ref is an object with a path property (DocumentReference), compare the path
            if (ref && typeof ref === 'object' && ref.path) {
              const matches = ref.path === targetPath;
              console.log(`Path comparison: ${ref.path} === ${targetPath} = ${matches}`);
              return !matches;
            }

            // If we can't determine the reference, keep the contact
            console.log(`Could not determine reference, keeping contact`);
            return true;
          });
        };

        const aData = aSnap.data() || {};
        const bData = bSnap.data() || {};

        console.log(`User A (${userARef.path}) contacts before: ${aData.contacts?.length || 0} items`);
        console.log(`User B (${userBRef.path}) contacts before: ${bData.contacts?.length || 0} items`);

        const aUpdated = updateContacts(aData.contacts, userBRef.path);
        const bUpdated = updateContacts(bData.contacts, userARef.path);

        console.log(`User A contacts after filtering: ${aUpdated.length} items`);
        console.log(`User B contacts after filtering: ${bUpdated.length} items`);

        console.log(`Updating user documents with filtered contacts arrays`);
        await Promise.all([
          userARef.update({ contacts: aUpdated }),
          userBRef.update({ contacts: bUpdated }),
        ]);

        console.log(`Contact relation deleted successfully between ${userARef.path} and ${userBRef.path}`);
        return { success: true };
      } catch (error) {
        console.error("Error deleting contact relation:", error);
        throw new HttpsError("internal", "Failed to delete contact relation.");
      }
    }
);
