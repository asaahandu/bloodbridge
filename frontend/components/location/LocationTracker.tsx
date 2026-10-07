import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import { saveUserLocation, type LocationTrackingSession } from '@/lib/api';
import {
  getLocationTrackingSession,
  subscribeToLocationTrackingSession,
} from '@/lib/location-tracking-storage';

export function LocationTracker() {
  const [session, setSession] = useState<LocationTrackingSession | null>(null);
  const updateInProgress = useRef(false);

  useEffect(() => {
    const loadSession = () => {
      void getLocationTrackingSession().then(setSession);
    };

    loadSession();
    return subscribeToLocationTrackingSession(loadSession);
  }, []);

  useEffect(() => {
    if (!session) return;

    const currentSession = session;
    let active = true;
    let subscription: Location.LocationSubscription | undefined;

    async function startWatching() {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!active || permission.status !== Location.PermissionStatus.GRANTED) return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 1_000,
          timeInterval: 5 * 60 * 1_000,
        },
        (location) => {
          if (updateInProgress.current) return;
          updateInProgress.current = true;

          void saveUserLocation(currentSession, {
            longitude: location.coords.longitude,
            latitude: location.coords.latitude,
            ...(location.coords.accuracy == null ? {} : { accuracy: location.coords.accuracy }),
            capturedAt: new Date(location.timestamp).toISOString(),
          })
            .catch((error) => {
              console.warn(
                'BloodBridge could not sync a foreground location update:',
                error instanceof Error ? error.message : 'Unknown error',
              );
            })
            .finally(() => {
              updateInProgress.current = false;
            });
        },
      );

      if (!active) subscription.remove();
    }

    void startWatching();

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [session]);

  return null;
}
