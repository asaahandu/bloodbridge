import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DonorSearchModal } from '@/components/hospital-dashboard';
import {
  confirmHospitalDonorResponse,
  getHospitalBloodRequest,
  getHospitalRequestDonorMatches,
  recordHospitalDonorOutcome,
  type DonorMatchScan,
  type StoredBloodRequest,
} from '@/lib/api';
import { getAuthenticatedUser } from '@/lib/auth-session';
import { formatElapsed } from '@/lib/hospital-request-view';

export default function HospitalRequestDetailScreen() {
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const [request, setRequest] = useState<StoredBloodRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingDonorId, setConfirmingDonorId] = useState<string>();
  const [recordingOutcomeDonorId, setRecordingOutcomeDonorId] = useState<string>();
  const [rankedMatchesVisible, setRankedMatchesVisible] = useState(false);
  const [rankedMatches, setRankedMatches] = useState<DonorMatchScan>();
  const [rankedMatchesLoading, setRankedMatchesLoading] = useState(false);
  const [rankedMatchesError, setRankedMatchesError] = useState('');

  const refresh = useCallback(async () => {
    if (!requestId) {
      setError('This request could not be identified.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'hospital') throw new Error('Please sign in as a hospital.');
      setRequest(await getHospitalBloodRequest(session.authToken, requestId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load this request.');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const progress = request?.donorProgress;
  const donorResponses = request?.donorResponses ?? [];
  const urgencyLabel = request?.urgency === 'standard' ? 'Routine' : request?.urgency ?? 'Open';

  const confirmDonor = async (donorId: string) => {
    if (!requestId || confirmingDonorId) return;

    setConfirmingDonorId(donorId);
    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'hospital') throw new Error('Please sign in as a hospital.');
      setRequest(await confirmHospitalDonorResponse(session.authToken, requestId, donorId));
    } catch (confirmationError) {
      Alert.alert(
        'Confirmation not saved',
        confirmationError instanceof Error ? confirmationError.message : 'Please try again.',
      );
    } finally {
      setConfirmingDonorId(undefined);
    }
  };

  const saveOutcome = async (donorId: string, outcome: 'completed' | 'no_show') => {
    if (!requestId || recordingOutcomeDonorId) return;

    setRecordingOutcomeDonorId(donorId);
    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'hospital') throw new Error('Please sign in as a hospital.');
      setRequest(
        await recordHospitalDonorOutcome(session.authToken, requestId, donorId, outcome),
      );
    } catch (outcomeError) {
      Alert.alert(
        'Outcome not saved',
        outcomeError instanceof Error ? outcomeError.message : 'Please try again.',
      );
    } finally {
      setRecordingOutcomeDonorId(undefined);
    }
  };

  const confirmOutcome = (donorId: string, outcome: 'completed' | 'no_show') => {
    Alert.alert(
      outcome === 'completed' ? 'Record completed donation?' : 'Record donor no-show?',
      'This outcome becomes training data for future donor ranking and cannot be changed.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: outcome === 'no_show' ? 'destructive' : 'default',
          text: 'Record outcome',
          onPress: () => void saveOutcome(donorId, outcome),
        },
      ],
    );
  };

  const loadRankedMatches = async () => {
    if (!requestId || rankedMatchesLoading) return;

    setRankedMatchesVisible(true);
    setRankedMatchesLoading(true);
    setRankedMatchesError('');
    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'hospital') throw new Error('Please sign in as a hospital.');
      setRankedMatches(await getHospitalRequestDonorMatches(session.authToken, requestId));
    } catch (matchError) {
      setRankedMatchesError(
        matchError instanceof Error ? matchError.message : 'Unable to rank donor matches.',
      );
    } finally {
      setRankedMatchesLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <ScrollView contentContainerClassName="px-5 pb-10 pt-3">
        <View className="mb-6 flex-row items-center gap-3">
          <Pressable
            accessibilityLabel="Return to hospital dashboard"
            className="h-11 w-11 items-center justify-center rounded-[14px] border border-line bg-card active:opacity-75"
            onPress={() => router.back()}>
            <Ionicons color="#121212" name="arrow-back" size={21} />
          </Pressable>
          <View>
            <Text className="text-[11px] font-extrabold tracking-[1.2px] text-blood-red">
              REQUEST DETAILS
            </Text>
            <Text className="mt-0.5 text-[21px] font-bold text-ink">
              {request?.internalReference ?? 'Blood request'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-row items-center gap-3 rounded-[15px] border border-line bg-card p-4">
            <ActivityIndicator color="#8E1722" size="small" />
            <Text className="text-xs font-semibold text-muted">Loading request details...</Text>
          </View>
        ) : null}

        {error ? (
          <View className="rounded-[15px] bg-error-soft p-4">
            <Text className="text-xs font-bold text-error">{error}</Text>
            <Pressable className="mt-2 self-start active:opacity-75" onPress={refresh}>
              <Text className="text-[10px] font-extrabold text-error">TRY AGAIN</Text>
            </Pressable>
          </View>
        ) : null}

        {request ? (
          <>
            <View className="rounded-[24px] bg-ink p-5">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-[38px] font-extrabold text-white">{request.bloodType}</Text>
                  <Text className="mt-1 text-sm font-semibold text-[#CBCBC7]">
                    {request.ward || request.hospitalName}
                  </Text>
                </View>
                <View className="rounded-[10px] bg-blood-red px-3 py-2">
                  <Text className="text-[10px] font-black tracking-[0.8px] text-white">
                    {urgencyLabel.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View className="mt-5 flex-row items-center gap-2 border-t border-[#343434] pt-4">
                <Ionicons color="#AFAFAC" name="time-outline" size={16} />
                <Text className="text-xs text-[#AFAFAC]">Posted {formatElapsed(request.createdAt)}</Text>
              </View>
            </View>

            <Text className="mb-3 mt-7 text-[19px] font-bold text-ink">Donor progress</Text>
            <View className="flex-row gap-2.5">
              {[
                ['Notified', progress?.notified ?? 0],
                ['Responded', progress?.responded ?? 0],
                ['Confirmed', progress?.confirmed ?? 0],
              ].map(([label, value], index) => (
                <View
                  className={`flex-1 rounded-[18px] border p-4 ${
                    index === 2 ? 'border-[#D7E9DE] bg-success-soft' : 'border-line bg-card'
                  }`}
                  key={label}>
                  <Text className={`text-[24px] font-extrabold ${index === 2 ? 'text-success' : 'text-ink'}`}>
                    {value}
                  </Text>
                  <Text className={`mt-1 text-[10px] font-semibold ${index === 2 ? 'text-success' : 'text-muted'}`}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              className="mt-3 h-12 flex-row items-center justify-center gap-2 rounded-[14px] bg-ink active:opacity-75"
              onPress={() => void loadRankedMatches()}>
              <Ionicons color="#F5A3AA" name="analytics-outline" size={18} />
              <Text className="text-xs font-extrabold text-white">View ranked donor matches</Text>
            </Pressable>

            <Text className="mb-3 mt-7 text-[19px] font-bold text-ink">Donor responses</Text>
            {donorResponses.length === 0 ? (
              <View className="rounded-[18px] border border-line bg-card p-5">
                <Text className="text-xs font-bold text-ink">No responses yet</Text>
                <Text className="mt-1 text-[10px] leading-[15px] text-muted">
                  Donors who accept or decline this request will appear here.
                </Text>
              </View>
            ) : (
              <View className="gap-2.5">
                {donorResponses.map((donorResponse) => {
                  const accepted = donorResponse.decision === 'accepted';
                  const confirmed = Boolean(donorResponse.confirmedAt);
                  const confirming = confirmingDonorId === donorResponse.donorId;
                  const recordingOutcome =
                    recordingOutcomeDonorId === donorResponse.donorId;

                  return (
                    <View
                      className="flex-row items-center gap-3 rounded-[18px] border border-line bg-card p-4"
                      key={donorResponse.donorId}>
                      <Pressable
                        accessibilityHint="Opens donor details and eligibility screening summary"
                        accessibilityRole="button"
                        className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-70"
                        onPress={() =>
                          router.navigate({
                            pathname: '/hospitals/donors/[donorId]',
                            params: { donorId: donorResponse.donorId, requestId },
                          })
                        }>
                        <View className="h-11 w-11 items-center justify-center rounded-[13px] bg-blood-red-soft">
                          <Text className="text-sm font-extrabold text-blood-red">
                            {donorResponse.bloodType}
                          </Text>
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text className="text-xs font-bold text-ink" numberOfLines={1}>
                            {donorResponse.donorName}
                          </Text>
                          <Text className="mt-1 text-[10px] text-muted">
                          {accepted ? 'Accepted request' : 'Not available'} ·{' '}
                          {new Date(donorResponse.respondedAt).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          </Text>
                        </View>
                        <Ionicons color="#8B8B88" name="chevron-forward" size={17} />
                      </Pressable>
                      {donorResponse.outcome ? (
                        <View
                          className={`rounded-[10px] px-3 py-2 ${
                            donorResponse.outcome === 'completed'
                              ? 'bg-success-soft'
                              : 'bg-[#EFEFED]'
                          }`}>
                          <Text
                            className={`text-[9px] font-extrabold ${
                              donorResponse.outcome === 'completed' ? 'text-success' : 'text-muted'
                            }`}>
                            {donorResponse.outcome === 'completed' ? 'COMPLETED' : 'NO-SHOW'}
                          </Text>
                        </View>
                      ) : confirmed ? (
                        <View className="gap-1.5">
                          <Pressable
                            className="min-w-[82px] items-center rounded-[9px] bg-success-soft px-2 py-2 active:opacity-70 disabled:opacity-50"
                            disabled={Boolean(recordingOutcomeDonorId)}
                            onPress={() => confirmOutcome(donorResponse.donorId, 'completed')}>
                            {recordingOutcome ? (
                              <ActivityIndicator color="#1F6A4C" size="small" />
                            ) : (
                              <Text className="text-[8px] font-extrabold text-success">COMPLETED</Text>
                            )}
                          </Pressable>
                          <Pressable
                            className="min-w-[82px] items-center rounded-[9px] bg-[#EFEFED] px-2 py-2 active:opacity-70 disabled:opacity-50"
                            disabled={Boolean(recordingOutcomeDonorId)}
                            onPress={() => confirmOutcome(donorResponse.donorId, 'no_show')}>
                            <Text className="text-[8px] font-extrabold text-muted">NO-SHOW</Text>
                          </Pressable>
                        </View>
                      ) : accepted ? (
                        <Pressable
                          className="min-w-[82px] items-center rounded-[10px] bg-blood-red px-3 py-2.5 active:bg-blood-red-dark disabled:opacity-50"
                          disabled={Boolean(confirmingDonorId)}
                          onPress={() => void confirmDonor(donorResponse.donorId)}>
                          {confirming ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Text className="text-[9px] font-extrabold text-white">CONFIRM</Text>
                          )}
                        </Pressable>
                      ) : (
                        <View className="rounded-[10px] bg-[#EFEFED] px-3 py-2">
                          <Text className="text-[9px] font-bold text-muted">DECLINED</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <Text className="mb-3 mt-7 text-[19px] font-bold text-ink">Request information</Text>
            <View className="rounded-[21px] border border-line bg-card px-4">
              {[
                ['water-outline', 'Units needed', String(request.unitsNeeded)],
                ['location-outline', 'Facility', `${request.hospitalName} · ${request.city}`],
                ['business-outline', 'Ward or department', request.ward || 'Not specified'],
                ['calendar-outline', 'Needed by', new Date(request.neededBy).toLocaleString()],
                [
                  'gift-outline',
                  'Proposed reward',
                  request.rewardAmount == null
                    ? 'No reward proposed'
                    : `${request.rewardAmount.toLocaleString()} ${request.rewardCurrency ?? 'XAF'}`,
                ],
                ['information-circle-outline', 'Status', request.status],
              ].map(([icon, label, value], index) => (
                <View
                  className={`flex-row items-center gap-3 py-4 ${index < 5 ? 'border-b border-line' : ''}`}
                  key={label}>
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F1F1EF]">
                    <Ionicons color="#5F5F5C" name={icon as keyof typeof Ionicons.glyphMap} size={17} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-semibold text-muted">{label}</Text>
                    <Text className="mt-1 text-xs font-bold capitalize text-ink">{value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {request ? (
        <DonorSearchModal
          bloodType={request.bloodType}
          error={rankedMatchesError}
          fallbackHospitalCoordinates={request.facilityLocation.coordinates}
          fallbackRadiusKm={{ standard: 10, urgent: 20, critical: 40 }[request.urgency]}
          hospitalName={request.hospitalName}
          loading={rankedMatchesLoading}
          onClose={() => setRankedMatchesVisible(false)}
          onRetry={() => void loadRankedMatches()}
          requestReference={request.internalReference}
          scan={rankedMatches}
          visible={rankedMatchesVisible}
        />
      ) : null}
    </SafeAreaView>
  );
}
