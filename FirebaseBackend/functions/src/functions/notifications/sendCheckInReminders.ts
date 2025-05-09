import { onSchedule } from "firebase-functions/v2/scheduler";
import { handleNotifications } from "../utils/handleNotifications";

/**
 * Scheduled function that runs every 15 minutes to send check-in reminders
 * and notifications to users and their responders.
 *
 * @function sendCheckInReminders
 * @type {CloudFunction<unknown>}
 */
export const sendCheckInReminders = onSchedule("every 15 minutes", async () => {
  await handleNotifications();
});
