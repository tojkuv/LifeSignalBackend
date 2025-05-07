import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import {onCall} from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { v4 as uuidv4 } from "uuid";

initializeApp();

const db = getFirestore();
const messaging = admin.messaging();

interface UserProfile {
  name: string;
  phone: string;
  note: string;
  checkInInterval: number;
  lastCheckedIn: FirebaseFirestore.Timestamp;
  expirationTimestamp: FirebaseFirestore.Timestamp;
  contacts: ContactReference[];
  fcmToken?: string;
  notify30MinBefore?: boolean;
  notify2HoursBefore?: boolean;
}

interface ContactReference {
  isResponder: boolean;
  isDependent: boolean;
  reference: FirebaseFirestore.DocumentReference;
}

export const sendCheckInReminders = onSchedule("every 15 minutes", async () => {
  await handleNotifications();
});

async function handleNotifications(): Promise<void> {
  const now = Date.now();
  const snapshot = await db.collection("users").get();

  for (const doc of snapshot.docs) {
    const user = doc.data() as UserProfile;

    logger.info(`Checking user: ${doc.id}`, { user });

    const lastCheckedIn = user.lastCheckedIn.toDate().getTime();
    const expiry = lastCheckedIn + user.checkInInterval;
    const timeLeft = expiry - now;

    const token = user.fcmToken;
    if (!token) {
      logger.warn(`No FCM token for user: ${doc.id}`);
      continue;
    }

    if (
        user.notify2HoursBefore &&
        timeLeft < 2 * 60 * 60 * 1000 &&
        timeLeft > 1.9 * 60 * 60 * 1000
    ) {
      logger.info(`Sending 2-hour reminder to ${doc.id}`);
      await messaging.send({
        token,
        notification: {
          title: "Check-in Reminder",
          body: "Your check-in expires in 2 hours",
        },
      });
    }

    if (
        user.notify30MinBefore &&
        timeLeft < 30 * 60 * 1000 &&
        timeLeft > 29 * 60 * 1000
    ) {
      logger.info(`Sending 30-minute reminder to ${doc.id}`);
      await messaging.send({
        token,
        notification: {
          title: "Check-in Reminder",
          body: "Your check-in expires in 30 minutes",
        },
      });
    }

    if (now > expiry) {
      for (const contact of user.contacts) {
        if (!contact.isResponder) continue;

        const contactSnap = await contact.reference.get();
        const contactData = contactSnap.data() as UserProfile;
        const contactToken = contactData?.fcmToken;
        if (!contactToken) continue;

        logger.info(`Notifying responder for expired check-in: ${doc.id} -> ${contactSnap.id}`);
        await messaging.send({
          token: contactToken,
          notification: {
            title: "Emergency Alert",
            body: `${user.name}'s check-in has expired.`,
          },
        });
      }
    }
  }
}

export const addContactRelation = onCall(
    { cors: true },
    async (request) => {
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

      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
      }

      if (!userRefPath || !contactRefPath) {
        throw new HttpsError("invalid-argument", "Both user and contact references are required.");
      }

      const db = admin.firestore();
      const userRef = db.doc(userRefPath);
      const contactRef = db.doc(contactRefPath);

      try {
        const [userSnap, contactSnap] = await Promise.all([
          userRef.get(),
          contactRef.get(),
        ]);

        if (!userSnap.exists || !contactSnap.exists) {
          throw new HttpsError("not-found", "One or both users not found.");
        }

        const userData = userSnap.data() || {};
        const contactData = contactSnap.data() || {};

        const userContacts = Array.isArray(userData.contacts) ? userData.contacts : [];
        const contactContacts = Array.isArray(contactData.contacts) ? contactData.contacts : [];

        const userEntry = {
          reference: contactRef,
          isResponder,
          isDependent,
        };

        const contactEntry = {
          reference: userRef,
          isResponder: isDependent,
          isDependent: isResponder,
        };

        const updatedUserContacts = [
          ...userContacts.filter(c => (c.reference?.path ?? c.contact?.path) !== contactRef.path),
          userEntry,
        ];

        const updatedContactContacts = [
          ...contactContacts.filter(c => (c.reference?.path ?? c.contact?.path) !== userRef.path),
          contactEntry,
        ];

        const newQrCodeId = uuidv4();

        await Promise.all([
          userRef.update({ contacts: updatedUserContacts }),
          contactRef.update({
            contacts: updatedContactContacts,
            qrCodeId: newQrCodeId
          }),
        ]);

        return { success: true };
      } catch (error: any) {
        console.error("Error adding contact relation:", {
          message: error.message,
          stack: error.stack,
          raw: error,
        });
        throw new HttpsError("internal", error.message || "Failed to add contact relation.");
      }
    }
);

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