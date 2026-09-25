import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DonorScreenHeader, ProfileSection } from '@/components/donor-tabs';
import { registerPushNotificationsForCurrentDevice } from '@/components/notifications/PushNotificationRegistrar';
import {
    type DonorAvailabilityPreset,
    updateDonorDonationProfile,
    updateNotificationPreferences,
} from '@/lib/api';
import { saveAuthenticatedUser, signOutAuthenticatedUser } from '@/lib/auth-session';
import { useDonorSession } from '@/lib/donor-session-hook';

type DetailRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  last?: boolean;
  value: string;
};

function DetailRow({ icon, label, last, value }: DetailRowProps) {
  return (
    <View className={`flex-row items-center gap-3 py-4 ${last ? '' : 'border-b border-line'}`}>
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F1F1EF]">
        <Ionicons color="#5F5F5C" name={icon} size={17} />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] font-semibold text-muted">{label}</Text>
        <Text className="mt-1 text-xs font-bold text-ink">{value}</Text>
      </View>
    </View>
  );
}

type PreferenceRowProps = {
  description: string;
  last?: boolean;
  onValueChange: (value: boolean) => void;
  title: string;
  value: boolean;
};

function PreferenceRow({ description, last, onValueChange, title, value }: PreferenceRowProps) {
  return (
    <View className={`flex-row items-center gap-3 py-4 ${last ? '' : 'border-b border-line'}`}>
      <View className="flex-1">
        <Text className="text-xs font-bold text-ink">{title}</Text>
        <Text className="mt-1 text-[10px] leading-[15px] text-muted">{description}</Text>
      </View>
      <Switch
        onValueChange={onValueChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: '#D5D5D1', true: '#8E1722' }}
        value={value}
      />
    </View>
  );
}

export default function DonorProfileScreen() {
  const router = useRouter();
  const { loading, user } = useDonorSession();
  const [pushAlerts, setPushAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [useSavedLocation, setUseSavedLocation] = useState(true);
  const [radiusKm, setRadiusKm] = useState<10 | 25 | 50>(25);
  const [lastDonationDate, setLastDonationDate] = useState('');
  const [availabilityPreset, setAvailabilityPreset] =
    useState<DonorAvailabilityPreset>('anytime');
  const [eligibilityStatus, setEligibilityStatus] = useState<
    'interval_clear' | 'waiting_period' | 'needs_verification'
  >('needs_verification');
  const [nextEligibleAt, setNextEligibleAt] = useState('');
  const [savingMatchingProfile, setSavingMatchingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    setPushAlerts(user.notificationPreferences?.pushEnabled ?? true);
    setEmailAlerts(user.notificationPreferences?.emailEnabled ?? true);
    setLastDonationDate(user.donationProfile?.lastDonationAt?.slice(0, 10) ?? '');
    setAvailabilityPreset(user.donationProfile?.availabilityPreset ?? 'anytime');
    setRadiusKm(user.donationProfile?.maxTravelDistanceKm ?? 25);
    setEligibilityStatus(user.donationProfile?.eligibilityStatus ?? 'needs_verification');
    setNextEligibleAt(user.donationProfile?.nextEligibleAt ?? '');
  }, [user]);

  const saveMatchingProfile = async () => {
    if (!user || savingMatchingProfile) return;
    if (lastDonationDate && !/^\d{4}-\d{2}-\d{2}$/.test(lastDonationDate)) {
      Alert.alert('Check the date', 'Use the YYYY-MM-DD format for the last donation date.');
      return;
    }

    setSavingMatchingProfile(true);
    try {
      const updatedUser = await updateDonorDonationProfile(user, {
        ...(lastDonationDate ? { lastDonationAt: `${lastDonationDate}T12:00:00.000Z` } : {}),
        availabilityPreset,
        maxTravelDistanceKm: radiusKm,
      });
      await saveAuthenticatedUser(updatedUser);
      setEligibilityStatus(
        updatedUser.donationProfile?.eligibilityStatus ?? 'needs_verification',
      );
      setNextEligibleAt(updatedUser.donationProfile?.nextEligibleAt ?? '');
      Alert.alert('Matching profile saved', 'Future requests will use these preferences.');
    } catch (profileError) {
      Alert.alert(
        'Profile not saved',
        profileError instanceof Error ? profileError.message : 'Please try again.',
      );
    } finally {
      setSavingMatchingProfile(false);
    }
  };

  const saveNotificationPreferences = async (nextPushEnabled: boolean, nextEmailEnabled: boolean) => {
    if (!user) return;

    const previousPushEnabled = pushAlerts;
    const previousEmailEnabled = emailAlerts;
    setPushAlerts(nextPushEnabled);
    setEmailAlerts(nextEmailEnabled);

    try {
      const updatedUser = await updateNotificationPreferences(user, {
        pushEnabled: nextPushEnabled,
        emailEnabled: nextEmailEnabled,
      });
      await saveAuthenticatedUser(updatedUser);
      if (nextPushEnabled && !previousPushEnabled) {
        await registerPushNotificationsForCurrentDevice();
      }
    } catch (preferenceError) {
      setPushAlerts(previousPushEnabled);
      setEmailAlerts(previousEmailEnabled);
      Alert.alert(
        'Preference not saved',
        preferenceError instanceof Error ? preferenceError.message : 'Please try again.',
      );
    }
  };

  const signOut = async () => {
    await signOutAuthenticatedUser();
    router.replace('/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerClassName="px-5 pb-10 pt-5" showsVerticalScrollIndicator={false}>
        <DonorScreenHeader
          subtitle="Manage eligibility, location, alerts, and account details."
          title="Profile & health"
        />

        <View className="mt-6 rounded-[23px] bg-ink p-5">
          <View className="flex-row items-center gap-4">
            <View className="h-14 w-14 items-center justify-center rounded-[17px] bg-blood-red">
              <Text className="text-lg font-extrabold text-white">
                {user?.bloodType === 'unknown' ? 'Not known' : (user?.bloodType ?? '—')}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-white">
                {user?.fullName ?? (loading ? 'Loading profile…' : 'Donor account')}
              </Text>
              <Text className="mt-1 text-[11px] text-[#AFAFAC]">
                {user?.cityRegion ?? 'Location not available'}
              </Text>
            </View>
            <View
              className={`rounded-xl px-2.5 py-2 ${
                eligibilityStatus === 'interval_clear' ? 'bg-success-soft' : 'bg-blood-red-soft'
              }`}>
              <Text
                className={`text-[9px] font-extrabold ${
                  eligibilityStatus === 'interval_clear' ? 'text-success' : 'text-blood-red'
                }`}>
                {eligibilityStatus === 'interval_clear'
                  ? 'INTERVAL CLEAR'
                  : eligibilityStatus === 'waiting_period'
                    ? 'WAITING PERIOD'
                    : 'VERIFY DATE'}
              </Text>
            </View>
          </View>
        </View>

        <ProfileSection title="Donation & eligibility">
          <DetailRow
            icon="water-outline"
            label="Blood type"
            value={
              user?.bloodType === 'unknown' ? 'Not known' : (user?.bloodType ?? 'Not recorded')
            }
          />
          <View className="border-b border-line py-4">
            <Text className="text-[10px] font-semibold text-muted">Last whole-blood donation</Text>
            <View className="mt-2 flex-row items-center rounded-[13px] border border-line bg-[#FAFAF9] px-3">
              <Ionicons color="#5F5F5C" name="calendar-outline" size={17} />
              <TextInput
                accessibilityLabel="Last donation date"
                className="h-11 flex-1 px-3 text-xs font-bold text-ink"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                onChangeText={setLastDonationDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9B9B97"
                value={lastDonationDate}
              />
            </View>
            <Text className="mt-2 text-[9px] leading-[14px] text-muted">
              Leave blank if unknown. Blood-bank staff must still confirm final eligibility.
            </Text>
          </View>
          <DetailRow
            icon="checkmark-circle-outline"
            label="Next interval check"
            last
            value={
              !lastDonationDate
                ? 'Date verification required'
                : eligibilityStatus === 'waiting_period' && nextEligibleAt
                  ? new Date(nextEligibleAt).toLocaleDateString()
                  : 'Minimum interval clear'
            }
          />
        </ProfileSection>

        <ProfileSection
          description="Used to rank alerts; it never replaces a direct availability check."
          title="Availability preference">
          <View className="flex-row flex-wrap gap-2 py-4">
            {(
              [
                ['anytime', 'Any time'],
                ['weekdays', 'Weekdays'],
                ['weekends', 'Weekends'],
                ['daytime', 'Daytime'],
                ['evenings', 'Evenings'],
              ] as const
            ).map(([preset, label]) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: availabilityPreset === preset }}
                className={`rounded-xl border px-3 py-2.5 active:opacity-75 ${
                  availabilityPreset === preset
                    ? 'border-blood-red bg-blood-red'
                    : 'border-line bg-[#FAFAF9]'
                }`}
                key={preset}
                onPress={() => setAvailabilityPreset(preset)}>
                <Text
                  className={`text-[10px] font-bold ${
                    availabilityPreset === preset ? 'text-white' : 'text-ink'
                  }`}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ProfileSection>

        <ProfileSection
          description="Update your screening whenever your health changes."
          title="Health screening">
          <DetailRow
            icon="medkit-outline"
            label="Screening status"
            last
            value="Up to date"
          />
        </ProfileSection>

        <ProfileSection title="Location & travel">
          <DetailRow icon="location-outline" label="Home area" value={user?.cityRegion ?? 'Not recorded'} />
          <PreferenceRow
            description="Use your saved GPS position to prioritize nearby requests"
            last
            onValueChange={setUseSavedLocation}
            title="Use saved location"
            value={useSavedLocation}
          />
        </ProfileSection>

        <Text className="mb-3 mt-4 text-[10px] font-semibold text-muted">TRAVEL RADIUS</Text>
        <View className="flex-row gap-2">
          {([10, 25, 50] as const).map((radius) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: radiusKm === radius }}
              className={`h-11 flex-1 items-center justify-center rounded-[13px] border ${
                radiusKm === radius ? 'border-blood-red bg-blood-red' : 'border-line bg-card'
              }`}
              key={radius}
              onPress={() => setRadiusKm(radius)}>
              <Text
                className={`text-xs font-extrabold ${radiusKm === radius ? 'text-white' : 'text-ink'}`}>
                {radius} km
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: savingMatchingProfile || !user }}
          className={`mt-3 h-12 flex-row items-center justify-center gap-2 rounded-[14px] bg-ink active:opacity-75 ${
            savingMatchingProfile || !user ? 'opacity-60' : ''
          }`}
          disabled={savingMatchingProfile || !user}
          onPress={() => void saveMatchingProfile()}>
          {savingMatchingProfile ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons color="#FFFFFF" name="save-outline" size={17} />
          )}
          <Text className="text-xs font-extrabold text-white">
            {savingMatchingProfile ? 'Saving...' : 'Save matching preferences'}
          </Text>
        </Pressable>

        <ProfileSection
          description="Choose how BloodBridge should alert you about future matching requests."
          title="Notifications">
          <PreferenceRow
            description="Recommended for urgent nearby requests"
            onValueChange={(value) => void saveNotificationPreferences(value, emailAlerts)}
            title="Push notifications"
            value={pushAlerts}
          />
          <PreferenceRow
            description="Receive email updates whenever a nearby request matches"
            last
            onValueChange={(value) => void saveNotificationPreferences(pushAlerts, value)}
            title="Email alerts"
            value={emailAlerts}
          />
        </ProfileSection>

        <ProfileSection title="Account">
          <DetailRow icon="call-outline" label="Phone" value={user?.phone ?? 'Not available'} />
          <DetailRow icon="mail-outline" label="Email" last value={user?.email ?? 'Not available'} />
        </ProfileSection>

        <Pressable
          accessibilityRole="button"
          className="mt-7 h-12 flex-row items-center justify-center gap-2 rounded-[14px] border border-[#E7C7CA] bg-blood-red-soft active:opacity-75"
          onPress={signOut}>
          <Ionicons color="#8E1722" name="log-out-outline" size={19} />
          <Text className="text-xs font-extrabold text-blood-red">Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
