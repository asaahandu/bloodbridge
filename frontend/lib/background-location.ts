import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { saveUserLocation } from './api';
import { getLocationTrackingSession } from './location-tracking-storage';

export const BACKGROUND_LOCATION_TASK = 'bloodbridge-background-location';

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  BACKGROUND_LOCATION_TASK,
  async ({ data, error }) => {
    if (error || !data?.locations?.length) return;

    const session = await getLocationTrackingSession();
    if (!session) return;

    const latestLocation = data.locations[data.locations.length - 1];

    try {
      await saveUserLocation(session, {
        longitude: latestLocation.coords.longitude,
        latitude: latestLocation.coords.latitude,
        ...(latestLocation.coords.accuracy == null
          ? {}
          : { accuracy: latestLocation.coords.accuracy }),
        capturedAt: new Date(latestLocation.timestamp).toISOString(),
      });
    } catch (updateError) {
      console.warn(
        'BloodBridge could not sync a background location update:',
        updateError instanceof Error ? updateError.message : 'Unknown error',
      );
    }
  },
);

export async function startBackgroundLocationTracking() {
  if (Platform.OS === 'web') return false;

  const available = await TaskManager.isAvailableAsync();
  if (!available) return false;

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (alreadyStarted) return true;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 1_000,
    timeInterval: 5 * 60 * 1_000,
    deferredUpdatesDistance: 1_000,
    deferredUpdatesInterval: 5 * 60 * 1_000,
    pausesUpdatesAutomatically: true,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'BloodBridge location updates',
      notificationBody: 'Keeping your area current for nearby blood requests.',
      killServiceOnDestroy: false,
    },
  });

  return true;
}
