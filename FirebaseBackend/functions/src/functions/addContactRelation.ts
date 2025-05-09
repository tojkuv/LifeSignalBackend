import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Cloud function to create a bidirectional contact relationship between two users using a QR code.
 *
 * This function:
 * 1. Takes a user ID, QR code, and role information
 * 2. Looks up the target user by QR code
 * 3. Creates a bidirectional relationship between the users with the specified roles
 *
 * @function addContactRelation
 * @param {Object} request - The function request object
 * @param {Object} request.data - The request data
 * @param {string} request.data.userId - ID of the user who scanned the QR code
 * @param {string} request.data.qrCode - The QR code that was scanned
 * @param {boolean} request.data.isResponder - Whether the scanned user is a responder for the scanning user
 * @param {boolean} request.data.isDependent - Whether the scanned user is a dependent of the scanning user
 * @returns {Promise<{success: boolean, contactId: string}>} - Success status and the ID of the added contact
 * @throws {HttpsError} - If authentication fails or if users cannot be found
 */
export const addContactRelation = onCall(
    { cors: true },
    async (request) => {
      const {
        userId,
        qrCode,
        isResponder,
        isDependent,
      } = request.data as {
        userId: string;
        qrCode: string;
        isResponder: boolean;
        isDependent: boolean;
      };

      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
      }

      if (!userId || !qrCode) {
        throw new HttpsError("invalid-argument", "User ID and QR code are required.");
      }

      const db = admin.firestore();

      try {
        // Look up the user by QR code
        const qrLookupSnapshot = await db.collection('qr_lookup')
          .where('qrCode', '==', qrCode)
          .limit(1)
          .get();

        if (qrLookupSnapshot.empty) {
          throw new HttpsError("not-found", "No user found with the provided QR code.");
        }

        const qrLookupDoc = qrLookupSnapshot.docs[0];
        const contactUserId = qrLookupDoc.id; // The document ID is the user ID

        // Prevent adding yourself as a contact
        if (userId === contactUserId) {
          throw new HttpsError("invalid-argument", "Cannot add yourself as a contact.");
        }

        // Get references to both users
        const userRef = db.collection('users').doc(userId);
        const contactRef = db.collection('users').doc(contactUserId);

        // Get both user documents
        const [userSnap, contactSnap] = await Promise.all([
          userRef.get(),
          contactRef.get(),
        ]);

        if (!userSnap.exists || !contactSnap.exists) {
          throw new HttpsError("not-found", "One or both users not found.");
        }

        const userData = userSnap.data() || {};
        const contactData = contactSnap.data() || {};

        // Create a timestamp for the creation
        const now = admin.firestore.Timestamp.now();

        // Ensure contacts arrays exist and are properly formatted
        const userContacts = Array.isArray(userData.contacts) ? userData.contacts : [];
        const contactContacts = Array.isArray(contactData.contacts) ? contactData.contacts : [];

        // Check if the contact already exists
        const existingContactIndex = userContacts.findIndex(c => {
          const path = c.reference?.path || c.contact?.path;
          return path === contactRef.path;
        });

        if (existingContactIndex !== -1) {
          throw new HttpsError("already-exists", "This user is already in your contacts.");
        }

        // Create entries for each user's contacts list with default values
        const userEntry = {
          reference: contactRef,
          isResponder,
          isDependent,
          sendPings: true,
          receivePings: true,
          notifyOnCheckIn: isResponder,
          notifyOnExpiry: isResponder,
          lastUpdated: now
        };

        const contactEntry = {
          reference: userRef,
          isResponder: isDependent,
          isDependent: isResponder,
          sendPings: true,
          receivePings: true,
          notifyOnCheckIn: isDependent,
          notifyOnExpiry: isDependent,
          lastUpdated: now
        };

        // Add the new contacts
        const updatedUserContacts = [...userContacts, userEntry];
        const updatedContactContacts = [...contactContacts, contactEntry];

        // Update both users' contact lists
        await Promise.all([
          userRef.update({ contacts: updatedUserContacts }),
          contactRef.update({ contacts: updatedContactContacts })
        ]);

        return {
          success: true,
          contactId: contactUserId
        };
      } catch (error: any) {
        console.error("Error adding contact relation:", {
          message: error.message,
          stack: error.stack,
          raw: error,
        });
        throw new HttpsError(
          error.code || "internal",
          error.message || "Failed to add contact relation."
        );
      }
    }
);
