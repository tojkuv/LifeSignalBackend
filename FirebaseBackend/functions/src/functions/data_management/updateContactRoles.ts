import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { ContactReference } from "../../models/interfaces";

/**
 * Cloud function to update the roles of an existing contact relationship.
 *
 * This function:
 * 1. Takes a user reference and a contact reference
 * 2. Updates the isResponder and isDependent roles in the user's contact entry
 * 3. Updates the reciprocal roles in the contact's entry for the user
 *
 * @function updateContactRoles
 * @param {Object} request - The function request object
 * @param {Object} request.data - The request data
 * @param {string} request.data.userRefPath - Firestore document path to the user
 * @param {string} request.data.contactRefPath - Firestore document path to the contact
 * @param {boolean} request.data.isResponder - Whether the contact is a responder for the user
 * @param {boolean} request.data.isDependent - Whether the contact is a dependent of the user
 * @returns {Promise<{success: boolean}>} - Success status of the operation
 * @throws {HttpsError} - If authentication fails or if users cannot be found
 */
export const updateContactRoles = onCall(
    { cors: true },
    async (request) => {
      // Extract parameters from the request
      const {
        userRefPath,
        contactRefPath,
        isResponder,
        isDependent,
      } = request.data as {
        userRefPath: string;
        contactRefPath: string;
        isResponder: boolean;
        isDependent: boolean;
      };

      console.log(`Received update contact roles request: userRefPath=${userRefPath}, contactRefPath=${contactRefPath}, isResponder=${isResponder}, isDependent=${isDependent}`);

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

      if (isResponder === undefined || isDependent === undefined) {
        console.log("Missing role parameters - request rejected");
        throw new HttpsError("invalid-argument", "Both isResponder and isDependent must be provided.");
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

        // Find the existing contact entry in the user's contacts
        const userContactIndex = userContacts.findIndex(c => {
          // Check both old reference.path and new referencePath formats
          const path = c.reference?.path || c.referencePath;
          return path === contactRef.path;
        });

        // Find the user in the contact's contacts list
        const contactUserIndex = contactContacts.findIndex(c => {
          // Check both old reference.path and new referencePath formats
          const path = c.reference?.path || c.referencePath;
          return path === userRef.path;
        });

        // If either relationship doesn't exist, throw an error
        if (userContactIndex === -1 || contactUserIndex === -1) {
          console.log("Contact relationship not found - request rejected");
          throw new HttpsError("not-found", "Contact relationship not found.");
        }

        // Create a timestamp for the update
        const now = admin.firestore.Timestamp.now();

        // Update the user's contact entry
        const userContact = userContacts[userContactIndex] as ContactReference;
        userContact.isResponder = isResponder;
        userContact.isDependent = isDependent;
        userContact.lastUpdated = now;
        userContacts[userContactIndex] = userContact;

        // Update the contact's entry for the user (with reciprocal roles)
        const contactUser = contactContacts[contactUserIndex] as ContactReference;
        contactUser.isResponder = isDependent; // Reciprocal role: user's dependent is contact's responder
        contactUser.isDependent = isResponder; // Reciprocal role: user's responder is contact's dependent
        contactUser.lastUpdated = now;
        contactContacts[contactUserIndex] = contactUser;

        // Update both documents
        await Promise.all([
          userRef.update({ contacts: userContacts }),
          contactRef.update({ contacts: contactContacts }),
        ]);

        console.log("Successfully updated contact roles");
        return { success: true };
      } catch (error: any) {
        console.error("Error updating contact roles:", error);
        throw new HttpsError("internal", "Failed to update contact roles: " + error.message);
      }
    }
);
