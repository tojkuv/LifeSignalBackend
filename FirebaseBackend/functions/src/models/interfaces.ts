/**
 * Interface representing a user profile in Firestore
 *
 * @interface UserProfile
 * @property {string} name - User's full name
 * @property {string} phone - User's phone number in E.164 format
 * @property {string} note - User's emergency profile description/note
 * @property {number} checkInInterval - User's check-in interval in seconds
 * @property {FirebaseFirestore.Timestamp} lastCheckedIn - Timestamp of user's last check-in
 * @property {FirebaseFirestore.Timestamp} expirationTimestamp - Timestamp when the check-in expires
 * @property {ContactReference[]} contacts - Array of user's contacts
 * @property {string} [fcmToken] - Firebase Cloud Messaging token for push notifications
 * @property {boolean} [notify30MinBefore] - Whether to notify 30 minutes before check-in expiration
 * @property {boolean} [notify2HoursBefore] - Whether to notify 2 hours before check-in expiration
 */
export interface UserProfile {
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

/**
 * Interface representing a contact reference in a user's contacts array
 *
 * @interface ContactReference
 * @property {boolean} isResponder - Whether this contact is a responder for the user
 * @property {boolean} isDependent - Whether this contact is a dependent of the user
 * @property {FirebaseFirestore.DocumentReference} [reference] - Reference to the contact's user document (legacy format)
 * @property {string} [referencePath] - Path to the contact's user document (new format)
 * @property {boolean} [sendPings] - Whether to send pings to this contact
 * @property {boolean} [receivePings] - Whether to receive pings from this contact
 * @property {boolean} [notifyOnCheckIn] - Whether to notify this contact on check-in
 * @property {boolean} [notifyOnExpiry] - Whether to notify this contact on check-in expiry
 * @property {string} [nickname] - Optional nickname for this contact
 * @property {string} [notes] - Optional notes about this contact
 * @property {FirebaseFirestore.Timestamp} [lastUpdated] - When this contact was last updated
 */
export interface ContactReference {
  isResponder: boolean;
  isDependent: boolean;
  reference?: FirebaseFirestore.DocumentReference; // Legacy format
  referencePath?: string; // New format: "users/userId"
  sendPings?: boolean;
  receivePings?: boolean;
  notifyOnCheckIn?: boolean;
  notifyOnExpiry?: boolean;
  nickname?: string;
  notes?: string;
  lastUpdated?: FirebaseFirestore.Timestamp;
}
