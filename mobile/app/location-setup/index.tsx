import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { authColors } from '@/components/auth/theme';
import { saveUserLocation } from '@/lib/api';
import { startBackgroundLocationTracking } from '@/lib/background-location';
import {
  getLocationTrackingSession,
  saveLocationTrackingSession,
} from '@/lib/location-tracking-storage';

type SetupStatus =
  | 'requesting'
  | 'locating'
  | 'saving'
  | 'denied'
  | 'error'
  | 'saved'
  | 'background-requesting'
  | 'tracking-enabled'
  | 'tracking-limited';

const statusCopy: Record<
  Extract<SetupStatus, 'requesting' | 'locating' | 'saving' | 'background-requesting'>,
  string
> = {
  requesting: 'Waiting for location permission...',
  locating: 'Obtaining your current GPS position...',
  saving: 'Saving your location securely...',
  'background-requesting': 'Enabling automatic location updates...',
};

export default function LocationSetupScreen() {
  const router = useRouter();
  const started = useRef(false);
  const [status, setStatus] = useState<SetupStatus>('requesting');
  const [message, setMessage] = useState('');
  const [canAskAgain, setCanAskAgain] = useState(true);

  const captureAndSaveLocation = useCallback(async () => {
    setMessage('');

    try {
      const session = await getLocationTrackingSession();
      if (!session) {
        setStatus('error');
        setMessage('Your location tracking session is missing. Please create the account again.');
        return;
      }

      setStatus('requesting');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setCanAskAgain(permission.canAskAgain);
        setStatus('denied');
        setMessage(
          'Location permission is required to connect this account with nearby blood requests.',
        );
        return;
      }

      setStatus('locating');
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setStatus('saving');
      await saveUserLocation(session, {
        longitude: currentLocation.coords.longitude,
        latitude: currentLocation.coords.latitude,
        ...(currentLocation.coords.accuracy == null
          ? {}
          : { accuracy: currentLocation.coords.accuracy }),
        capturedAt: new Date(currentLocation.timestamp).toISOString(),
      });
      await saveLocationTrackingSession(session);
      setStatus('saved');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save your location.');
    }
  }, []);

  const enableAutomaticUpdates = useCallback(async () => {
    setMessage('');
    setStatus('background-requesting');

    try {
      const permission = await Location.requestBackgroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setCanAskAgain(permission.canAskAgain);
        setStatus('tracking-limited');
        setMessage(
          'Background permission was not granted. Your location will still update while BloodBridge is open.',
        );
        return;
      }

      const startedInBackground = await startBackgroundLocationTracking();
      if (!startedInBackground) {
        setStatus('tracking-limited');
        setMessage(
          'Background updates require a development or production build. Updates will continue while the app is open.',
        );
        return;
      }

      setStatus('tracking-enabled');
    } catch (error) {
      setStatus('tracking-limited');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Background updates are unavailable. App-open updates remain active.',
      );
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void captureAndSaveLocation();
  }, [captureAndSaveLocation]);

  const busy =
    status === 'requesting' ||
    status === 'locating' ||
    status === 'saving' ||
    status === 'background-requesting';
  const initialLocationSaved =
    status === 'saved' || status === 'tracking-enabled' || status === 'tracking-limited';

  const continueToLogin = () => {
    router.replace({ pathname: '/login', params: { created: '1', located: '1' } });
  };

  return (
    <>
      <StatusBar style="dark" />
      <AuthScreen
        eyebrow="One final step"
        footer={
          <Text className="text-center text-xs leading-[18px] text-muted">
            You control location access in your phone settings at any time.
          </Text>
        }
        subtitle="Keep your area current so BloodBridge can connect you with relevant nearby requests."
        title="Set your location">
        <View className="gap-5">
          <View className="items-center gap-4 rounded-2xl bg-blood-red-soft px-5 py-7">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-blood-red">
              <Ionicons color={authColors.white} name="location" size={30} />
            </View>
            <View className="gap-1.5">
              <Text className="text-center text-lg font-extrabold text-ink">
                {status === 'tracking-enabled'
                  ? 'Automatic updates enabled'
                  : initialLocationSaved
                    ? 'Current location saved'
                    : 'Enable GPS access'}
              </Text>
              <Text className="text-center text-sm leading-5 text-muted">
                {status === 'tracking-enabled'
                  ? 'Your stored area can now change after meaningful movement.'
                  : initialLocationSaved
                    ? 'Enable background access to keep it current when the app is not open.'
                    : 'We store your latest coordinates so nearby matching can work.'}
              </Text>
            </View>
          </View>

          {busy ? (
            <View className="flex-row items-center gap-3 rounded-xl bg-field p-4">
              <ActivityIndicator color={authColors.red} />
              <Text className="flex-1 text-sm font-semibold text-muted">{statusCopy[status]}</Text>
            </View>
          ) : null}

          {message ? (
            <View className="flex-row items-start gap-2.5 rounded-xl bg-error-soft p-4">
              <Ionicons color={authColors.error} name="alert-circle" size={20} />
              <Text className="flex-1 text-sm font-semibold leading-5 text-error">{message}</Text>
            </View>
          ) : null}

          {status === 'denied' || status === 'error' ? (
            <Pressable
              accessibilityRole="button"
              className="h-14 flex-row items-center justify-center gap-2 rounded-[15px] bg-ink active:opacity-75"
              onPress={() => {
                if (status === 'denied' && !canAskAgain) {
                  void Linking.openSettings();
                  return;
                }
                void captureAndSaveLocation();
              }}>
              <Ionicons
                color={authColors.white}
                name={status === 'denied' && !canAskAgain ? 'settings-outline' : 'refresh-outline'}
                size={19}
              />
              <Text className="text-[15px] font-extrabold text-white">
                {status === 'denied' && !canAskAgain ? 'Open settings' : 'Try again'}
              </Text>
            </Pressable>
          ) : null}

          {status === 'saved' ? (
            <View className="gap-3 rounded-2xl border border-[#E3B64B] bg-[#FFF8E6] p-4">
              <View className="flex-row items-start gap-3">
                <Ionicons color="#7A4B00" name="navigate-circle" size={24} />
                <View className="flex-1 gap-1">
                  <Text className="text-sm font-extrabold text-[#4E360B]">
                    Keep your location updated
                  </Text>
                  <Text className="text-xs leading-[18px] text-[#6B5120]">
                    BloodBridge will update your stored area after about 1 km of movement. This may
                    use additional battery.
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-ink active:opacity-75"
                onPress={() => void enableAutomaticUpdates()}>
                <Ionicons color={authColors.white} name="location-outline" size={18} />
                <Text className="text-sm font-extrabold text-white">Enable automatic updates</Text>
              </Pressable>
            </View>
          ) : null}

          {initialLocationSaved ? (
            <Pressable
              accessibilityRole="button"
              className="h-14 flex-row items-center justify-center gap-2 rounded-[15px] border border-line bg-card active:opacity-75"
              onPress={continueToLogin}>
              <Text className="text-[15px] font-extrabold text-ink">Continue to sign in</Text>
              <Ionicons color={authColors.black} name="arrow-forward" size={19} />
            </Pressable>
          ) : null}

          {status === 'tracking-limited' && !canAskAgain ? (
            <Pressable
              accessibilityRole="button"
              className="items-center py-1 active:opacity-75"
              onPress={() => void Linking.openSettings()}>
              <Text className="text-sm font-bold text-blood-red">Open location settings</Text>
            </Pressable>
          ) : null}
        </View>
      </AuthScreen>
    </>
  );
}
