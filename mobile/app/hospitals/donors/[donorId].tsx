import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getHospitalDonorResponseDetail,
  type HospitalDonorDetail,
} from '@/lib/api';
import { getAuthenticatedUser } from '@/lib/auth-session';

function formatDate(value?: string) {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatGender(value?: HospitalDonorDetail['donor']['gender']) {
  if (!value) return 'Not recorded';
  if (value === 'prefer-not-to-say') return 'Prefer not to say';
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function HospitalDonorDetailScreen() {
  const router = useRouter();
  const { donorId, requestId } = useLocalSearchParams<{
    donorId?: string;
    requestId?: string;
  }>();
  const [detail, setDetail] = useState<HospitalDonorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDetail = useCallback(
    async (isRefresh = false) => {
      if (!donorId || !requestId) {
        setError('This donor response could not be identified.');
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        const session = await getAuthenticatedUser();
        if (!session || session.role !== 'hospital') {
          throw new Error('Please sign in as a hospital.');
        }
        setDetail(
          await getHospitalDonorResponseDetail(session.authToken, requestId, donorId),
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load donor details.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [donorId, requestId],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail]),
  );

  const screening = detail?.eligibilityScreening;
  const screeningComplete = screening?.status === 'completed';
  const responseLabel = detail?.response.outcome
    ? detail.response.outcome === 'completed'
      ? 'Donation completed'
      : 'No-show recorded'
    : detail?.response.confirmedAt
      ? 'Confirmed by hospital'
      : detail?.response.decision === 'accepted'
        ? 'Accepted request'
        : 'Not available';

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-3"
        refreshControl={
          <RefreshControl
            colors={['#8E1722']}
            onRefresh={() => void loadDetail(true)}
            refreshing={refreshing}
            tintColor="#8E1722"
          />
        }
        showsVerticalScrollIndicator={false}>
        <View className="mb-6 flex-row items-center gap-3">
          <Pressable
            accessibilityLabel="Return to request details"
            className="h-11 w-11 items-center justify-center rounded-[14px] border border-line bg-card active:opacity-75"
            onPress={() => router.back()}>
            <Ionicons color="#121212" name="arrow-back" size={21} />
          </Pressable>
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] font-extrabold tracking-[1.2px] text-blood-red">
              DONOR DETAILS
            </Text>
            <Text className="mt-0.5 text-[21px] font-bold text-ink" numberOfLines={1}>
              {detail?.donor.fullName ?? 'Donor profile'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-row items-center gap-3 rounded-[16px] border border-line bg-card p-5">
            <ActivityIndicator color="#8E1722" size="small" />
            <Text className="text-xs font-semibold text-muted">Loading donor details...</Text>
          </View>
        ) : null}

        {error ? (
          <View className="rounded-[16px] bg-error-soft p-4">
            <Text className="text-xs font-bold text-error">{error}</Text>
            <Pressable
              className="mt-3 self-start active:opacity-70"
              onPress={() => void loadDetail()}>
              <Text className="text-[10px] font-extrabold text-error">TRY AGAIN</Text>
            </Pressable>
          </View>
        ) : null}

        {detail ? (
          <>
            <View className="rounded-[24px] bg-ink p-5">
              <View className="flex-row items-start">
                <View className="h-16 w-16 items-center justify-center rounded-[19px] bg-blood-red">
                  <Text className="text-[22px] font-extrabold text-white">
                    {detail.donor.bloodType}
                  </Text>
                </View>
                <View className="ml-4 min-w-0 flex-1">
                  <Text className="text-[20px] font-extrabold text-white" numberOfLines={2}>
                    {detail.donor.fullName}
                  </Text>
                  <Text className="mt-1 text-[11px] font-semibold text-[#AFAFAC]">
                    {detail.donor.cityRegion}
                  </Text>
                  <View className="mt-3 self-start rounded-[9px] bg-[#2B2B2B] px-2.5 py-1.5">
                    <Text className="text-[9px] font-extrabold text-[#F5A3AA]">
                      {responseLabel?.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              <View className="mt-5 flex-row items-center border-t border-[#343434] pt-4">
                <Ionicons color="#AFAFAC" name="document-text-outline" size={16} />
                <Text className="ml-2 text-[11px] text-[#AFAFAC]">
                  Request {detail.request.internalReference}
                </Text>
              </View>
            </View>

            <Text className="mb-3 mt-7 text-[19px] font-bold text-ink">Donor information</Text>
            <View className="rounded-[21px] border border-line bg-card px-4">
              {[
                ['mail-outline', 'Email', detail.donor.email],
                ['call-outline', 'Phone', detail.donor.phone],
                ['location-outline', 'City or region', detail.donor.cityRegion],
                [
                  'calendar-outline',
                  'Age',
                  detail.donor.age == null ? 'Not recorded' : `${detail.donor.age} years`,
                ],
                ['person-outline', 'Gender', formatGender(detail.donor.gender)],
                ['water-outline', 'Last donation', formatDate(detail.donor.lastDonationAt)],
              ].map(([icon, label, value], index) => (
                <View
                  className={`flex-row items-center gap-3 py-4 ${index < 5 ? 'border-b border-line' : ''}`}
                  key={label}>
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F1F1EF]">
                    <Ionicons
                      color="#5F5F5C"
                      name={icon as keyof typeof Ionicons.glyphMap}
                      size={17}
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[10px] font-semibold text-muted">{label}</Text>
                    <Text className="mt-1 text-xs font-bold text-ink" selectable>
                      {value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View className="mb-3 mt-7 flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-[19px] font-bold text-ink">
                AI eligibility pre-screening
              </Text>
              <View
                className={`rounded-full px-2.5 py-1.5 ${
                  screeningComplete
                    ? 'bg-success-soft'
                    : screening
                      ? 'bg-[#FFF3D6]'
                      : 'bg-[#EFEFED]'
                }`}>
                <Text
                  className={`text-[8px] font-extrabold tracking-[0.6px] ${
                    screeningComplete
                      ? 'text-success'
                      : screening
                        ? 'text-[#8A6513]'
                        : 'text-muted'
                  }`}>
                  {screeningComplete ? 'COMPLETED' : screening ? 'IN PROGRESS' : 'NOT STARTED'}
                </Text>
              </View>
            </View>

            {screeningComplete ? (
              <View className="rounded-[21px] border border-line bg-card p-5">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-ink">
                    <Ionicons color="#FFFFFF" name="sparkles" size={18} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-xs font-extrabold text-ink">Answer summary</Text>
                    <Text className="mt-0.5 text-[9px] text-muted">
                      Completed {formatDate(screening.completedAt)}
                    </Text>
                  </View>
                </View>
                <Text className="mt-4 text-[12px] font-medium leading-[19px] text-ink">
                  {screening.answerSummary || 'No summary was returned.'}
                </Text>

                {screening.reviewFlags.length ? (
                  <View className="mt-5 border-t border-line pt-4">
                    <Text className="text-[10px] font-extrabold tracking-[1px] text-blood-red">
                      ITEMS FOR CLINICAL REVIEW
                    </Text>
                    {screening.reviewFlags.map((flag) => (
                      <View className="mt-3 flex-row items-start" key={flag}>
                        <Ionicons color="#8E1722" name="alert-circle-outline" size={16} />
                        <Text className="ml-2 flex-1 text-[11px] font-medium leading-[17px] text-ink">
                          {flag}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="mt-5 flex-row items-center rounded-[14px] bg-success-soft p-3">
                    <Ionicons color="#1F6A4C" name="checkmark-circle-outline" size={17} />
                    <Text className="ml-2 flex-1 text-[10px] font-semibold text-success">
                      The AI summary contains no additional review flags.
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="rounded-[21px] border border-line bg-card p-5">
                <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-[#EFEFED]">
                  <Ionicons color="#737373" name="hourglass-outline" size={21} />
                </View>
                <Text className="mt-3 text-sm font-bold text-ink">
                  {screening ? 'Screening is not complete yet' : 'No screening result yet'}
                </Text>
                <Text className="mt-1 text-[11px] leading-[17px] text-muted">
                  {screening
                    ? 'The answer summary will appear here after the donor completes every pre-screening topic.'
                    : detail.response.decision === 'accepted'
                      ? 'The donor has accepted this request but has not started the AI pre-screening.'
                      : 'Eligibility pre-screening is started only after a donor accepts a request.'}
                </Text>
              </View>
            )}

            <View className="mt-4 flex-row items-start rounded-[16px] bg-[#FBEDEE] p-4">
              <Ionicons color="#8E1722" name="shield-checkmark-outline" size={18} />
              <Text className="ml-2 flex-1 text-[10px] font-semibold leading-[16px] text-[#6D4B4E]">
                This AI summary is an initial pre-screening record, not a final eligibility
                decision. Complete the hospital&apos;s clinical assessment before donation.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
