import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { ContactReference } from "../models/interfaces";

/**
 * Cloud function to update properties of an existing contact relationship.
 *
 * This function:
 * 1. Takes a user reference and a contact reference
 * 2. Updates specific properties of the contact in the user's contacts list
 * 3. Optionally updates reciprocal properties in the contact's reference to the user
 *
 * @function updateContactRelation
 * @param {Object} request - The function request object
 * @param {Object} request.data - The request data
 * @param {string} request.data.userRefPath - Firestore document path to the user
 * @param {string} request.data.contactRefPath - Firestore document path to the contact
 * @param {boolean} [request.data.isResponder] - Whether the contact is a responder for the user
 * @param {boolean} [request.data.isDependent] - Whether the contact is a dependent of the user
 * @param {boolean} [request.data.sendPings] - Whether to send pings to this contact
 * @param {boolean} [request.data.receivePings] - Whether to receive pings from this contact
 * @param {boolean} [request.data.notifyOnCheckIn] - Whether to notify this contact on check-in
 * @param {boolean} [request.data.notifyOnExpiry] - Whether to notify this contact on check-in expiry
 * @param {string} [request.data.nickname] - Optional nickname for this contact
 * @param {string} [request.data.notes] - Optional notes about this contact
 * @param {boolean} [request.data.updateReciprocal] - Whether to update reciprocal relationship (default: true)
 * @returns {Promise<{success: boolean}>} - Success status of the operation
 * @throws {HttpsError} - If authentication fails or if users cannot be found
 */
export const updateContactRelation = onCall(
    { cors: true },
    async (request) => {
      // Extract all possible parameters from the request
      const {
        userRefPath,
        contactRefPath,
        isResponder,
        isDependent,
        sendPings,
        receivePings,
        notifyOnCheckIn,
        notifyOnExpiry,
        nickname,
        notes,
        updateReciprocal = true, // Default to updating both sides of the relationship
      } = request.data as {
        userRefPath: string;
        contactRefPath: string;
        isResponder?: boolean;
        isDependent?: boolean;
        sendPings?: boolean;
        receivePings?: boolean;
        notifyOnCheckIn?: boolean;
        notifyOnExpiry?: boolean;
        nickname?: string;
        notes?: string;
        updateReciprocal?: boolean;
      };

      // Ensure user is authenticated
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
      }

      // Validate required parameters
      if (!userRefPath || !contactRefPath) {
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
          throw new HttpsError("not-found", "One or both users not found.");
        }

        const userData = userSnap.data() || {};
        const contactData = contactSnap.data() || {};

        // Ensure contacts arrays exist
        const userContacts = Array.isArray(userData.contacts) ? userData.contacts : [];
        const contactContacts = Array.isArray(contactData.contacts) ? contactData.contacts : [];

        // Find the existing contact entry in the user's contacts
        const userContactIndex = userContacts.findIndex(c => {
          const path = c.reference?.path || c.contact?.path;
          return path === contactRef.path;
        });

        // If contact doesn't exist, throw an error
        if (userContactIndex === -1) {
          throw new HttpsError("not-found", "Contact relationship not found.");
        }

        // Create a timestamp for the update
        const now = admin.firestore.Timestamp.now();

        // Create an updated contact entry with only the fields that were provided
        const updatedUserContact: Partial<ContactReference> = {
          ...userContacts[userContactIndex],
          lastUpdated: now,
        };

        // Only update fields that were provided in the request
        if (isResponder !== undefined) updatedUserContact.isResponder = isResponder;
        if (isDependent !== undefined) updatedUserContact.isDependent = isDependent;
        if (sendPings !== undefined) updatedUserContact.sendPings = sendPings;
        if (receivePings !== undefined) updatedUserContact.receivePings = receivePings;
        if (notifyOnCheckIn !== undefined) updatedUserContact.notifyOnCheckIn = notifyOnCheckIn;
        if (notifyOnExpiry !== undefined) updatedUserContact.notifyOnExpiry = notifyOnExpiry;
        if (nickname !== undefined) updatedUserContact.nickname = nickname;
        if (notes !== undefined) updatedUserContact.notes = notes;

        // Update the contact in the user's contacts array
        userContacts[userContactIndex] = updatedUserContact as ContactReference;

        // Prepare updates
        const updates: Promise<any>[] = [
          userRef.update({ contacts: userContacts }),
        ];

        // If we should update the reciprocal relationship
        if (updateReciprocal) {
          // Find the user in the contact's contacts list
          const contactUserIndex = contactContacts.findIndex(c => {
            const path = c.reference?.path || c.contact?.path;
            return path === userRef.path;
          });

          // If the reciprocal relationship exists
          if (contactUserIndex !== -1) {
            // Create an updated entry for the contact's contacts list
            const updatedContactUser: Partial<ContactReference> = {
              ...contactContacts[contactUserIndex],
              lastUpdated: now,
            };

            // Update reciprocal role fields if provided
            if (isResponder !== undefined) updatedContactUser.isDependent = isResponder;
            if (isDependent !== undefined) updatedContactUser.isResponder = isDependent;
            
            // Update reciprocal notification fields if provided
            if (sendPings !== undefined) updatedContactUser.receivePings = sendPings;
            if (receivePings !== undefined) updatedContactUser.sendPings = receivePings;

            // Update the contact's contacts array
            contactContacts[contactUserIndex] = updatedContactUser as ContactReference;
            
            // Add the update to our batch
            updates.push(contactRef.update({ contacts: contactContacts }));
          }
        }

        // Execute all updates
        await Promise.all(updates);

        return { success: true };
      } catch (error: any) {
        console.error("Error updating contact relation:", {
          message: error.message,
          stack: error.stack,
          raw: error,
        });
        throw new HttpsError("internal", error.message || "Failed to update contact relation.");
      }
    }
);
