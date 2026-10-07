import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import { saveUserLocation, type LocationTrackingSession } from '@/lib/api';
import {
  getLocationTrackingSession,
  subscribeToLocationTrackingSession,
} from '@/lib/location-tracking-storage';

const LOCATION_SYNC_INTERVAL_MS = 5 * 60 * 1_000;

/**
 * Browser-specific foreground tracking.
 *
 * expo-location 19.0.8 currently creates a web subscription whose remove()
 * path calls a missing EventEmitter.removeSubscription method. The browser's
 * native Geolocation API provides the same watch lifecycle without that
 * incompatible cleanup path.
 */
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
    if (!session || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const currentSession = session;
    let active = true;
    let watchId: number | undefined;
    let lastSyncAttemptAt = 0;

    async function startWatching() {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!active || permission.status !== Location.PermissionStatus.GRANTED) return;

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now();
          if (
            !active ||
            updateInProgress.current ||
            now - lastSyncAttemptAt < LOCATION_SYNC_INTERVAL_MS
          ) {
            return;
          }

          lastSyncAttemptAt = now;
          updateInProgress.current = true;

          void saveUserLocation(currentSession, {
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
            ...(position.coords.accuracy == null ? {} : { accuracy: position.coords.accuracy }),
            capturedAt: new Date(position.timestamp).toISOString(),
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
        (error) => {
          if (active && error.code !== error.PERMISSION_DENIED) {
            console.warn('BloodBridge could not watch the browser location:', error.message);
          }
        },
        {
          enableHighAccuracy: false,
          maximumAge: LOCATION_SYNC_INTERVAL_MS,
          timeout: 30_000,
        },
      );
    }

    void startWatching().catch((error) => {
      if (active) {
        console.warn(
          'BloodBridge could not start browser location tracking:',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    });

    return () => {
      active = false;
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [session]);

  return null;
}
