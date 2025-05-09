import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { ContactReference } from "../../models/interfaces";

/**
 * Cloud function to send a ping to a dependent contact.
 *
 * This function:
 * 1. Takes a user reference and a contact reference
 * 2. Sets the outgoing ping timestamp in the user's contact entry
 * 3. Sets the incoming ping timestamp in the contact's entry for the user
 * 4. Optionally sends a push notification to the contact
 *
 * @function pingDependent
 * @param {Object} request - The function request object
 * @param {Object} request.data - The request data
 * @param {string} request.data.userRefPath - Firestore document path to the user
 * @param {string} request.data.contactRefPath - Firestore document path to the contact
 * @returns {Promise<{success: boolean}>} - Success status of the operation
 * @throws {HttpsError} - If authentication fails or if users cannot be found
 */
export const pingDependent = onCall(
    { cors: true },
    async (request) => {
      const { userRefPath, contactRefPath } = request.data as {
        userRefPath: string;
        contactRefPath: string;
      };

      console.log(`Received ping dependent request: userRefPath=${userRefPath}, contactRefPath=${contactRefPath}`);

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

        // Verify the contact is a dependent of the user
        if (!userContacts[userContactIndex].isDependent) {
          console.log("Contact is not a dependent - request rejected");
          throw new HttpsError("failed-precondition", "Contact is not a dependent.");
        }

        // Get the current timestamp
        const now = admin.firestore.Timestamp.now();

        // Update the user's contact entry to set the outgoing ping
        const userContact = userContacts[userContactIndex] as ContactReference;
        userContact.outgoingPingTimestamp = now;
        userContact.lastUpdated = now;
        userContacts[userContactIndex] = userContact;

        // Update the contact's entry for the user to set the incoming ping
        const contactUser = contactContacts[contactUserIndex] as ContactReference;
        contactUser.incomingPingTimestamp = now;
        contactUser.lastUpdated = now;
        contactContacts[contactUserIndex] = contactUser;

        // Update both documents
        await Promise.all([
          userRef.update({ contacts: userContacts }),
          contactRef.update({ contacts: contactContacts }),
        ]);

        // Send a push notification to the contact if they have an FCM token
        const contactFcmToken = contactData.fcmToken;
        if (contactFcmToken) {
          try {
            const userName = userData.name || "A contact";
            await admin.messaging().send({
              token: contactFcmToken,
              notification: {
                title: "New Ping",
                body: `${userName} has sent you a ping.`,
              },
              data: {
                type: "ping",
                senderId: userRef.id,
                senderName: userData.name || "",
                timestamp: now.toDate().toISOString(),
              },
            });
            console.log("Push notification sent to contact");
          } catch (notificationError) {
            console.error("Error sending push notification:", notificationError);
            // Continue even if notification fails
          }
        }

        console.log("Successfully sent ping to dependent");
        return { success: true };
      } catch (error) {
        console.error("Error sending ping to dependent:", error);
        throw new HttpsError("internal", "Failed to send ping to dependent: " + error.message);
      }
    }
);
