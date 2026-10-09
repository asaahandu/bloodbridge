import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HospitalVerificationBadge } from '@/components/HospitalVerificationBadge';
import { DonationCentreMap } from '@/components/donor-home/DonationCentreMap';
import {
  type AuthenticatedUser,
  getDonorBloodRequest,
  type DonorBloodRequestDetail,
  getCurrentUser,
} from '@/lib/api';
import { getAuthenticatedUser, saveAuthenticatedUser } from '@/lib/auth-session';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not specified';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-3 border-b border-line py-3.5 last:border-b-0">
      <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-[10px] bg-blood-red-soft">
        <Ionicons color="#8E1722" name={icon} size={16} />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] font-semibold text-muted">{label}</Text>
        <Text className="mt-1 text-[13px] font-bold text-ink">{value}</Text>
      </View>
    </View>
  );
}

export default function DonorRequestDetailScreen() {
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const [detail, setDetail] = useState<DonorBloodRequestDetail | null>(null);
  const [donor, setDonor] = useState<AuthenticatedUser | null>(null);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDetail = useCallback(async () => {
    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'donor') {
        throw new Error('Please sign in as a donor to view this request.');
      }
      if (!requestId) throw new Error('This blood request could not be identified.');
      const [requestResult, donorResult] = await Promise.allSettled([
        getDonorBloodRequest(session.authToken, requestId),
        getCurrentUser(session),
      ]);
      if (requestResult.status === 'rejected') throw requestResult.reason;

      setDetail(requestResult.value);
      if (donorResult.status === 'fulfilled') {
        setDonor(donorResult.value);
        setLocationError('');
        await saveAuthenticatedUser(donorResult.value);
      } else {
        setDonor(session);
        setLocationError(
          donorResult.reason instanceof Error
            ? donorResult.reason.message
            : 'Unable to refresh your saved location.',
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Unable to load this request.',
      );
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail]),
  );

  const request = detail?.request;
  const donorCoordinates = donor?.location?.coordinates;
  const hospitalCoordinates = request?.facilityLocation?.coordinates;
  const validDonorCoordinates =
    donorCoordinates &&
    Number.isFinite(donorCoordinates[0]) &&
    Number.isFinite(donorCoordinates[1]) &&
    Math.abs(donorCoordinates[0]) <= 180 &&
    Math.abs(donorCoordinates[1]) <= 90
      ? donorCoordinates
      : undefined;
  const validHospitalCoordinates =
    hospitalCoordinates &&
    Number.isFinite(hospitalCoordinates[0]) &&
    Number.isFinite(hospitalCoordinates[1]) &&
    Math.abs(hospitalCoordinates[0]) <= 180 &&
    Math.abs(hospitalCoordinates[1]) <= 90
      ? hospitalCoordinates
      : undefined;
  const urgencyLabel =
    request?.urgency === 'standard' ? 'Routine' : request?.urgency ?? 'Request';
  const decisionLabel =
    detail?.decision === 'accepted'
      ? 'You accepted this request'
      : detail?.decision === 'declined'
        ? 'You marked yourself unavailable'
        : 'Awaiting your response';

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-3"
        showsVerticalScrollIndicator={false}>
        <View className="mb-6 flex-row items-center gap-3">
          <Pressable
            accessibilityLabel="Return to donor dashboard"
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
            <Pressable
              className="mt-2 self-start active:opacity-75"
              onPress={() => {
                setError('');
                setLoading(true);
                void loadDetail();
              }}>
              <Text className="text-[10px] font-extrabold text-error">TRY AGAIN</Text>
            </Pressable>
          </View>
        ) : null}

        {request ? (
          <>
            <View className="rounded-[24px] bg-ink p-5">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-[42px] font-extrabold text-white">
                    {request.bloodType}
                  </Text>
                  <View className="mt-1 flex-row flex-wrap items-center gap-2">
                    <Text className="text-sm font-semibold text-[#CBCBC7]">
                      {request.hospitalName}
                    </Text>
                    <HospitalVerificationBadge
                      inverse
                      status={request.hospitalVerificationStatus}
                    />
                  </View>
                </View>
                <View className="rounded-[10px] bg-blood-red px-3 py-2">
                  <Text className="text-[10px] font-black tracking-[0.8px] text-white">
                    {urgencyLabel.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View className="mt-5 flex-row items-center gap-2 border-t border-[#343434] pt-4">
                <Ionicons color="#AFAFAC" name="time-outline" size={16} />
                <Text className="text-xs text-[#AFAFAC]">
                  Needed by {formatDate(request.neededBy)}
                </Text>
              </View>
            </View>

            <View className="mt-5 rounded-[19px] border border-line bg-card px-4">
              <DetailRow
                icon="water-outline"
                label="Blood needed"
                value={`${request.unitsNeeded} ${request.unitsNeeded === 1 ? 'unit' : 'units'} of ${request.bloodType}`}
              />
              <DetailRow icon="business-outline" label="Hospital" value={request.hospitalName} />
              <DetailRow
                icon="location-outline"
                label="Location"
                value={[request.ward, request.address, request.city].filter(Boolean).join(', ')}
              />
              <DetailRow
                icon="bookmark-outline"
                label="Request reference"
                value={request.internalReference}
              />
              <DetailRow
                icon="calendar-outline"
                label="Needed by"
                value={formatDate(request.neededBy)}
              />
              {request.rewardAmount != null ? (
                <DetailRow
                  icon="wallet-outline"
                  label="Offered reward"
                  value={`${request.rewardAmount.toLocaleString()} ${request.rewardCurrency ?? 'XAF'}`}
                />
              ) : null}
            </View>

            <Text className="mb-3 mt-7 text-[17px] font-bold text-ink">Location map</Text>
            {validDonorCoordinates && validHospitalCoordinates ? (
              <>
                <DonationCentreMap
                  donorCoordinates={validDonorCoordinates}
                  donorName="Your saved location"
                  hospitalCoordinates={validHospitalCoordinates}
                  hospitalName={request.hospitalName}
                />
                <View className="mt-3 flex-row gap-3">
                  <View className="flex-1 flex-row items-center gap-2">
                    <View className="h-3 w-3 rounded-full bg-ink" />
                    <Text className="flex-1 text-[10px] font-semibold text-muted">
                      Your saved location
                    </Text>
                  </View>
                  <View className="flex-1 flex-row items-center gap-2">
                    <View className="h-3 w-3 rounded-full bg-blood-red" />
                    <Text className="flex-1 text-[10px] font-semibold text-muted">
                      Hospital
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View className="rounded-[19px] border border-line bg-card p-4">
                <Text className="text-xs font-bold text-ink">
                  {!validHospitalCoordinates
                    ? 'This request does not have a valid hospital GPS location.'
                    : 'Your saved GPS location is not available.'}
                </Text>
                <Text className="mt-1 text-[10px] leading-[15px] text-muted">
                  A map showing both locations will appear when both GPS locations are available.
                  {locationError ? ` ${locationError}` : ''}
                </Text>
              </View>
            )}

            <View className="mt-4 flex-row items-center gap-2 rounded-[15px] border border-line bg-card p-4">
              <Ionicons
                color={detail?.decision === 'accepted' ? '#1F6A4C' : '#8E1722'}
                name={
                  detail?.decision === 'accepted'
                    ? 'checkmark-circle'
                    : detail?.decision === 'declined'
                      ? 'remove-circle-outline'
                      : 'information-circle-outline'
                }
                size={19}
              />
              <Text className="flex-1 text-xs font-bold text-ink">{decisionLabel}</Text>
            </View>

            {detail?.decision === 'accepted' ? (
              <Pressable
                accessibilityRole="button"
                className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-[14px] bg-ink active:opacity-75"
                onPress={() =>
                  router.navigate({
                    pathname: '/ai-chat',
                    params: {
                      audience: 'donor',
                      mode: 'eligibility',
                      requestId,
                    },
                  })
                }>
                <Ionicons color="#FFFFFF" name="chatbubble-ellipses-outline" size={18} />
                <Text className="text-xs font-extrabold text-white">
                  Open eligibility screening
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
