import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KycRequestModal } from '@/components/hospital-kyc/KycRequestModal';
import { submitHospitalKycRequest, updateHospitalVoluntaryDonation } from '@/lib/api';
import { saveAuthenticatedUser, signOutAuthenticatedUser } from '@/lib/auth-session';
import { useHospitalAccount } from '@/lib/hospital-data-hooks';

type VoluntaryDonationDraft = {
  userId: string;
  initialEnabled: boolean;
  initialFeeXaf: number;
  enabled: boolean;
  feeXaf: string;
};

export default function HospitalProfileScreen() {
  const router = useRouter();
  const { error, loading, refresh, requests, user } = useHospitalAccount();
  const [matchAlerts, setMatchAlerts] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [kycModalVisible, setKycModalVisible] = useState(false);
  const [voluntaryDonationDraft, setVoluntaryDonationDraft] =
    useState<VoluntaryDonationDraft | null>(null);
  const [savingVoluntaryDonation, setSavingVoluntaryDonation] = useState(false);
  const [voluntaryDonationError, setVoluntaryDonationError] = useState('');
  const [voluntaryDonationSaved, setVoluntaryDonationSaved] = useState(false);

  const savedVoluntaryDonationEnabled = user?.voluntaryDonation?.enabled ?? false;
  const savedVoluntaryDonationFee = user?.voluntaryDonation?.feeXaf ?? 0;
  const draftMatchesSavedSettings =
    !!user &&
    voluntaryDonationDraft?.userId === user.id &&
    voluntaryDonationDraft.initialEnabled === savedVoluntaryDonationEnabled &&
    voluntaryDonationDraft.initialFeeXaf === savedVoluntaryDonationFee;
  const voluntaryDonationEnabled = draftMatchesSavedSettings
    ? voluntaryDonationDraft.enabled
    : savedVoluntaryDonationEnabled;
  const voluntaryDonationFee = draftMatchesSavedSettings
    ? voluntaryDonationDraft.feeXaf
    : String(savedVoluntaryDonationFee);

  const updateVoluntaryDonationDraft = (updates: Partial<Pick<VoluntaryDonationDraft, 'enabled' | 'feeXaf'>>) => {
    if (!user) return;
    setVoluntaryDonationDraft({
      userId: user.id,
      initialEnabled: savedVoluntaryDonationEnabled,
      initialFeeXaf: savedVoluntaryDonationFee,
      enabled: voluntaryDonationEnabled,
      feeXaf: voluntaryDonationFee,
      ...updates,
    });
  };

  const fulfilledCount = requests.filter((request) => request.status === 'fulfilled').length;
  const successRate = requests.length === 0 ? 0 : Math.round((fulfilledCount / requests.length) * 100);

  const signOut = async () => {
    await signOutAuthenticatedUser();
    router.replace('/login');
  };

  const locationValue = user?.location
    ? `${user.location.coordinates[1].toFixed(5)}, ${user.location.coordinates[0].toFixed(5)}`
    : 'GPS location not available';
  const verificationStatus = user?.hospitalVerificationStatus;
  const canSubmitKyc =
    !!user && verificationStatus !== 'verified' && verificationStatus !== 'pending';
  const verificationLabel = !user
    ? 'Not available'
    : verificationStatus === 'verified'
      ? 'Verified'
      : verificationStatus === 'pending'
        ? 'Under review'
        : verificationStatus === 'rejected'
          ? 'Request declined'
          : 'Not verified';

  const submitKyc = async (hospitalName: string, documents: import('expo-document-picker').DocumentPickerAsset[]) => {
    if (!user) throw new Error('Sign in again before submitting verification documents.');
    await submitHospitalKycRequest(user.authToken, hospitalName, documents);
    await refresh();
  };

  const saveVoluntaryDonation = async () => {
    if (!user) {
      setVoluntaryDonationError('Hospital account details are not available. Try refreshing the profile.');
      return;
    }

    const feeXaf = Number(voluntaryDonationFee.trim());
    if (!Number.isSafeInteger(feeXaf) || feeXaf < 0) {
      setVoluntaryDonationError('Enter a non-negative whole-number fee in XAF.');
      setVoluntaryDonationSaved(false);
      return;
    }

    setSavingVoluntaryDonation(true);
    setVoluntaryDonationError('');
    setVoluntaryDonationSaved(false);
    try {
      const updatedUser = await updateHospitalVoluntaryDonation(user, {
        enabled: voluntaryDonationEnabled,
        feeXaf,
      });
      await saveAuthenticatedUser(updatedUser);
      setVoluntaryDonationSaved(true);
    } catch (saveError) {
      setVoluntaryDonationError(
        saveError instanceof Error ? saveError.message : 'Unable to save voluntary donation settings.',
      );
    } finally {
      setSavingVoluntaryDonation(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerClassName="px-5 pb-10 pt-5" showsVerticalScrollIndicator={false}>
        <Text className="text-[11px] font-extrabold tracking-[1.4px] text-blood-red">
          HOSPITAL WORKSPACE
        </Text>
        <Text className="mt-1 text-[27px] font-bold tracking-[-0.6px] text-ink">Hospital profile</Text>
        <Text className="mt-1 text-xs leading-[18px] text-muted">
          Facility and account details stored by BloodBridge.
        </Text>

        {loading ? (
          <View className="mt-6 flex-row items-center gap-3 rounded-[15px] border border-line bg-card p-4">
            <ActivityIndicator color="#8E1722" size="small" />
            <Text className="text-xs font-semibold text-muted">Loading hospital profile...</Text>
          </View>
        ) : null}

        {error ? (
          <View className="mt-6 rounded-[15px] bg-error-soft p-4">
            <Text className="text-xs font-bold text-error">{error}</Text>
            <Pressable className="mt-2 self-start active:opacity-75" onPress={refresh}>
              <Text className="text-[10px] font-extrabold text-error">TRY AGAIN</Text>
            </Pressable>
          </View>
        ) : null}

        <View className="mt-6 rounded-[23px] bg-ink p-5">
          <View className="flex-row items-center gap-4">
            <View className="h-14 w-14 items-center justify-center rounded-[17px] bg-blood-red">
              <Ionicons color="#FFFFFF" name="business" size={27} />
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-white">{user?.fullName ?? 'Hospital account'}</Text>
              <Text className="mt-1 text-[11px] text-[#AFAFAC]">BloodBridge hospital facility</Text>
            </View>
            {verificationStatus === 'verified' ? (
              <Ionicons color="#73C59F" name="checkmark-circle" size={22} />
            ) : null}
          </View>
        </View>

        <Text className="mb-3 mt-7 text-[17px] font-bold text-ink">Facility details</Text>
        <View className="rounded-[21px] border border-line bg-card px-4">
          <Pressable
            accessibilityLabel={
              canSubmitKyc ? 'Submit hospital verification documents' : `Verification status: ${verificationLabel}`
            }
            accessibilityRole={canSubmitKyc ? 'button' : undefined}
            className={`flex-row items-center gap-3 border-b border-line py-4 ${canSubmitKyc ? 'active:opacity-70' : ''}`}
            disabled={!canSubmitKyc}
            onPress={() => setKycModalVisible(true)}>
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F1F1EF]">
              <Ionicons color="#5F5F5C" name="shield-checkmark-outline" size={17} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-semibold text-muted">Verification status</Text>
              <Text className="mt-1 text-xs font-bold text-ink">{verificationLabel}</Text>
              {canSubmitKyc ? (
                <Text className="mt-1 text-[10px] font-semibold text-blood-red">
                  {verificationStatus === 'rejected'
                    ? 'Tap to resubmit documents'
                    : 'Tap to submit verification documents'}
                </Text>
              ) : null}
            </View>
            {canSubmitKyc ? <Ionicons color="#8E1722" name="chevron-forward" size={18} /> : null}
          </Pressable>
          {[
            ['location-outline', 'City or region', user?.cityRegion ?? 'Not available'],
            ['navigate-outline', 'Saved GPS location', locationValue],
            ['call-outline', 'Account phone', user?.phone ?? 'Not available'],
            ['mail-outline', 'Account email', user?.email ?? 'Not available'],
          ].map(([icon, label, value], index) => (
            <View
              className={`flex-row items-center gap-3 py-4 ${index < 3 ? 'border-b border-line' : ''}`}
              key={label}>
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F1F1EF]">
                <Ionicons color="#5F5F5C" name={icon as keyof typeof Ionicons.glyphMap} size={17} />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-semibold text-muted">{label}</Text>
                <Text className="mt-1 text-xs font-bold text-ink">{value}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text className="mb-3 mt-7 text-[17px] font-bold text-ink">Voluntary donation</Text>
        <Text className="mb-3 text-[10px] leading-[15px] text-muted">
          Choose whether donors can make a voluntary donation to your facility and set the fee in XAF.
        </Text>
        <View className="rounded-[21px] border border-line bg-card px-4">
          <View className="flex-row items-center gap-3 border-b border-line py-4">
            <View className="flex-1">
              <Text className="text-xs font-bold text-ink">Accept voluntary donations</Text>
              <Text className="mt-1 text-[10px] leading-[15px] text-muted">
                Turn this option on or off for your hospital
              </Text>
            </View>
            <Switch
              accessibilityLabel="Accept voluntary donations"
              disabled={savingVoluntaryDonation || loading}
              onValueChange={(enabled) => {
                updateVoluntaryDonationDraft({ enabled });
                setVoluntaryDonationSaved(false);
              }}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#D5D5D1', true: '#8E1722' }}
              value={voluntaryDonationEnabled}
            />
          </View>
          <View className="py-4">
            <Text className="text-xs font-bold text-ink">Donation fee (XAF)</Text>
            <TextInput
              accessibilityLabel="Voluntary donation fee in XAF"
              className="mt-2 rounded-xl border border-line bg-white px-3 py-3 text-sm font-semibold text-ink"
              editable={!savingVoluntaryDonation && !loading}
              keyboardType="number-pad"
              onChangeText={(value) => {
                updateVoluntaryDonationDraft({ feeXaf: value });
                setVoluntaryDonationSaved(false);
              }}
              placeholder="0"
              placeholderTextColor="#8B8B88"
              value={voluntaryDonationFee}
            />
            <Text className="mt-1 text-[10px] leading-[15px] text-muted">
              Enter a whole-number XAF amount. Use 0 if there is no fee.
            </Text>
          </View>
          {voluntaryDonationError ? (
            <Text className="mb-3 text-[11px] font-semibold text-error">
              {voluntaryDonationError}
            </Text>
          ) : null}
          {voluntaryDonationSaved ? (
            <Text className="mb-3 text-[11px] font-semibold text-success">
              Voluntary donation settings saved.
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            className={`mb-4 h-12 flex-row items-center justify-center gap-2 rounded-[14px] bg-blood-red ${
              savingVoluntaryDonation || loading ? 'opacity-60' : 'active:opacity-75'
            }`}
            disabled={savingVoluntaryDonation || loading}
            onPress={() => void saveVoluntaryDonation()}>
            {savingVoluntaryDonation ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
            <Text className="text-xs font-extrabold text-white">
              {savingVoluntaryDonation ? 'Saving...' : 'Save settings'}
            </Text>
          </Pressable>
        </View>

        <Text className="mb-3 mt-7 text-[17px] font-bold text-ink">Request analytics</Text>
        <View className="flex-row gap-2.5">
          <View className="flex-1 rounded-[19px] bg-ink p-4">
            <Text className="text-[26px] font-extrabold text-white">{requests.length}</Text>
            <Text className="mt-1 text-[10px] font-semibold text-[#AFAFAC]">Total requests</Text>
          </View>
          <View className="flex-1 rounded-[19px] border border-[#D7E9DE] bg-success-soft p-4">
            <Text className="text-[26px] font-extrabold text-success">{fulfilledCount}</Text>
            <Text className="mt-1 text-[10px] font-semibold text-success">Fulfilled</Text>
          </View>
          <View className="flex-1 rounded-[19px] border border-line bg-card p-4">
            <Text className="text-[26px] font-extrabold text-ink">{successRate}%</Text>
            <Text className="mt-1 text-[10px] font-semibold text-muted">Success rate</Text>
          </View>
        </View>

        <Text className="mb-3 mt-7 text-[17px] font-bold text-ink">Notification preferences</Text>
        <Text className="mb-3 text-[10px] leading-[15px] text-muted">
          These switches currently apply to this device and are not saved to the hospital account.
        </Text>
        <View className="rounded-[21px] border border-line bg-card px-4">
          <View className="flex-row items-center gap-3 border-b border-line py-4">
            <View className="flex-1">
              <Text className="text-xs font-bold text-ink">Donor match updates</Text>
              <Text className="mt-1 text-[10px] leading-[15px] text-muted">
                Responses and confirmations for open requests
              </Text>
            </View>
            <Switch
              onValueChange={setMatchAlerts}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#D5D5D1', true: '#8E1722' }}
              value={matchAlerts}
            />
          </View>
          <View className="flex-row items-center gap-3 py-4">
            <View className="flex-1">
              <Text className="text-xs font-bold text-ink">Critical request alerts</Text>
              <Text className="mt-1 text-[10px] leading-[15px] text-muted">
                Escalations that require immediate staff action
              </Text>
            </View>
            <Switch
              onValueChange={setCriticalAlerts}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#D5D5D1', true: '#8E1722' }}
              value={criticalAlerts}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          className="mt-7 h-13 flex-row items-center justify-center gap-2 rounded-[14px] border border-[#E7C7CA] bg-blood-red-soft active:opacity-75"
          onPress={signOut}>
          <Ionicons color="#8E1722" name="log-out-outline" size={19} />
          <Text className="text-xs font-extrabold text-blood-red">Sign out</Text>
        </Pressable>
      </ScrollView>
      <KycRequestModal
        initialHospitalName={user?.fullName ?? ''}
        onClose={() => setKycModalVisible(false)}
        onSubmit={submitKyc}
        visible={kycModalVisible}
      />
    </SafeAreaView>
  );
}
