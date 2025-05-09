import { logger } from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { UserProfile } from "../models/interfaces";

/**
 * Handles the notification logic for check-in reminders and expired check-ins.
 * This function:
 * 1. Fetches all users from Firestore
 * 2. For each user, checks if they need a reminder (30min or 2hr before expiry)
 * 3. If a user's check-in has expired, notifies all their responders
 *
 * @async
 * @function handleNotifications
 * @returns {Promise<void>}
 */
export async function handleNotifications(): Promise<void> {
  // Initialize Firestore and Messaging instances
  const db = getFirestore();
  const messaging = admin.messaging();

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

        // Get contact reference - handle both old and new formats
        let contactRef;
        if (contact.reference) {
          contactRef = contact.reference;
        } else if (contact.referencePath) {
          contactRef = db.doc(contact.referencePath);
        } else {
          logger.warn(`Contact has no reference or referencePath: ${JSON.stringify(contact)}`);
          continue;
        }

        const contactSnap = await contactRef.get();
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
