import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerExpoPushToken } from '@/lib/api';
import { getAuthenticatedUser } from '@/lib/auth-session';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let lastHandledNotificationId: string | undefined;

function permissionIsGranted(permission: Notifications.NotificationPermissionsStatus) {
  if (Platform.OS !== 'ios') return permission.status === 'granted';

  return (
    permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

function openNotification(notification: Notifications.Notification) {
  if (notification.request.identifier === lastHandledNotificationId) return;
  lastHandledNotificationId = notification.request.identifier;

  const url = notification.request.content.data?.url;
  if (url === '/donors') router.push('/donors');
}

export async function registerPushNotificationsForCurrentDevice() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

  const session = await getAuthenticatedUser();
  if (!session || session.role !== 'donor') return;
  if (session.notificationPreferences?.pushEnabled === false) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('blood-requests', {
      name: 'Blood requests',
      description: 'Urgent nearby blood requests matching your donor profile',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: '#8E1722',
      sound: 'default',
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  const permission =
    permissionIsGranted(currentPermission)
      ? currentPermission
      : await Notifications.requestPermissionsAsync();
  if (!permissionIsGranted(permission)) return;

  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;
  if (!projectId || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(projectId)) {
    console.warn('BloodBridge push registration requires EXPO_PUBLIC_EAS_PROJECT_ID.');
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await registerExpoPushToken(session.authToken, { token, platform: Platform.OS });
}

export function PushNotificationRegistrar() {
  useEffect(() => {
    void registerPushNotificationsForCurrentDevice().catch((error) => {
      console.warn(
        'BloodBridge could not register this device for push notifications:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    });

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) openNotification(lastResponse.notification);

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => openNotification(response.notification),
    );

    return () => responseSubscription.remove();
  }, []);

  return null;
}
