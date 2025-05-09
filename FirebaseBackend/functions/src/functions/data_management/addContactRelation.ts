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
      console.log("addContactRelation function called with data:", JSON.stringify(request.data));
      console.log("Auth context:", request.auth ? "Authenticated" : "Not authenticated");

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

      console.log(`Processing request for userId: ${userId}, qrCode: ${qrCode}`);
      console.log(`Roles - isResponder: ${isResponder}, isDependent: ${isDependent}`);

      if (!request.auth) {
        console.error("Authentication missing in request");
        throw new HttpsError("unauthenticated", "Authentication required.");
      }

      console.log(`Authenticated user ID: ${request.auth.uid}`);

      if (!userId || !qrCode) {
        console.error("Missing required parameters");
        throw new HttpsError("invalid-argument", "User ID and QR code are required.");
      }

      const db = admin.firestore();

      try {
        console.log("Starting QR code lookup in Firestore");
        // Look up the user by QR code
        // The iOS app sends 'qrCode' as the parameter name, but the field in Firestore is 'qrCodeId'
        const qrLookupSnapshot = await db.collection('qr_lookup')
          .where('qrCodeId', '==', qrCode)
          .limit(1)
          .get();

        console.log(`QR lookup results: ${qrLookupSnapshot.empty ? 'No results' : qrLookupSnapshot.size + ' results'}`);

        if (qrLookupSnapshot.empty) {
          console.error(`No user found with QR code: ${qrCode}`);
          throw new HttpsError("not-found", "No user found with the provided QR code.");
        }

        const qrLookupDoc = qrLookupSnapshot.docs[0];
        const contactUserId = qrLookupDoc.id; // The document ID is the user ID
        console.log(`Found user with ID: ${contactUserId} for QR code: ${qrCode}`);

        // Prevent adding yourself as a contact
        if (userId === contactUserId) {
          console.error("User attempted to add themselves as a contact");
          throw new HttpsError("invalid-argument", "Cannot add yourself as a contact.");
        }

        // Get references to both users
        const userRef = db.collection('users').doc(userId);
        const contactRef = db.collection('users').doc(contactUserId);

        console.log("Debug - User reference:", userRef.path);
        console.log("Debug - Contact reference:", contactRef.path);

        // Get both user documents
        console.log("Fetching user documents");
        const [userSnap, contactSnap] = await Promise.all([
          userRef.get(),
          contactRef.get(),
        ]);

        console.log(`User document exists: ${userSnap.exists}, Contact document exists: ${contactSnap.exists}`);

        if (!userSnap.exists || !contactSnap.exists) {
          console.error("One or both user documents not found");
          throw new HttpsError("not-found", "One or both users not found.");
        }

        const userData = userSnap.data() || {};
        const contactData = contactSnap.data() || {};

        console.log("User data retrieved:", Object.keys(userData).join(", "));
        console.log("Contact data retrieved:", Object.keys(contactData).join(", "));

        // Create a timestamp for the creation
        const now = admin.firestore.Timestamp.now();

        // Ensure contacts arrays exist and are properly formatted
        const userContacts = Array.isArray(userData.contacts) ? userData.contacts : [];
        const contactContacts = Array.isArray(contactData.contacts) ? contactData.contacts : [];

        console.log("Debug - User contacts array length:", userContacts.length);
        console.log("Debug - Contact contacts array length:", contactContacts.length);
        console.log("Debug - User contacts array:", JSON.stringify(userContacts));
        console.log("Debug - Contact reference path:", contactRef.path);

        // Check if the contact already exists
        const existingContactIndex = userContacts.findIndex(c => {
          // Check both old reference.path and new referencePath formats
          const path = c.reference?.path || c.referencePath || c.contact?.path;
          console.log("Debug - Comparing path:", path, "with", contactRef.path);
          return path === contactRef.path;
        });

        console.log("Debug - Existing contact index:", existingContactIndex);

        if (existingContactIndex !== -1) {
          console.log("Debug - Contact already exists at index:", existingContactIndex);
          throw new HttpsError("already-exists", "This user is already in your contacts.");
        }

        // Create entries for each user's contacts list with default values
        console.log("Creating contact entries");

        // Store reference paths as strings instead of direct Firestore references
        // This avoids serialization issues when storing in Firestore
        const userEntry = {
          referencePath: contactRef.path, // Store path as string instead of reference
          isResponder,
          isDependent,
          sendPings: true,
          receivePings: true,
          notifyOnCheckIn: isResponder,
          notifyOnExpiry: isResponder,
          lastUpdated: now
        };

        const contactEntry = {
          referencePath: userRef.path, // Store path as string instead of reference
          isResponder: isDependent,
          isDependent: isResponder,
          sendPings: true,
          receivePings: true,
          notifyOnCheckIn: isDependent,
          notifyOnExpiry: isDependent,
          lastUpdated: now
        };

        // Log the entries for debugging
        console.log("User entry:", JSON.stringify(userEntry));
        console.log("Contact entry:", JSON.stringify(contactEntry));

        // Add the new contacts
        const updatedUserContacts = [...userContacts, userEntry];
        const updatedContactContacts = [...contactContacts, contactEntry];

        console.log("Updating Firestore documents");
        // Update both users' contact lists
        try {
          await Promise.all([
            userRef.update({ contacts: updatedUserContacts }),
            contactRef.update({ contacts: updatedContactContacts })
          ]);
          console.log("Successfully updated both user documents");
        } catch (updateError) {
          console.error("Error updating user documents:", updateError);
          throw updateError;
        }

        console.log("Contact relationship created successfully");
        return {
          success: true,
          contactId: contactUserId
        };
      } catch (error: any) {
        console.error("Error adding contact relation:", {
          message: error.message,
          stack: error.stack,
          code: error.code,
          details: error.details,
        });

        // Check if this is a Firestore permission error
        if (error.message && error.message.includes("permission")) {
          console.error("This appears to be a Firestore permission error. Check security rules and authentication.");
        }

        throw new HttpsError(
          error.code || "internal",
          error.message || "Failed to add contact relation."
        );
      }
    }
);
