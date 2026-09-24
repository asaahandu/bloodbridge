/**
 * expo-notifications push registration and notification-response APIs are
 * native-only in Expo SDK 54. Web dashboards still receive BloodBridge's
 * database-backed in-app activity, but they must not call these native APIs.
 */
export async function registerPushNotificationsForCurrentDevice() {}

export function PushNotificationRegistrar() {
  return null;
}
