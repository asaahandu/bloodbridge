import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    DonorHeader,
    DonorStatusCard,
    UrgentRequestsSection,
} from '@/components/donor-home';
import { useDonorResponses } from '@/components/donor-tabs';
import { useDonorRequests } from '@/lib/donor-data-hooks';

export default function DonorDashboardScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { error, loading, refresh, requests, user } = useDonorRequests();
  const { responses, respondToRequest } = useDonorResponses();
  const [available, setAvailable] = useState(true);
  const [respondingRequestId, setRespondingRequestId] = useState<string>();
  const responseByRequest = useMemo(
    () =>
      Object.fromEntries(
        responses.map((response) => [response.request.id, response.decision]),
      ) as Record<string, 'accepted' | 'declined'>,
    [responses],
  );
  const successfulDonations = responses.filter(
    (response) => response.outcome === 'completed',
  ).length;
  const eligible = user?.donationProfile?.eligibilityStatus !== 'waiting_period';
  const nextEligibleDate = user?.donationProfile?.nextEligibleAt
    ? new Date(user.donationProfile.nextEligibleAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      })
    : undefined;
  const firstName = user?.fullName.trim().split(/\s+/)[0] ?? 'Donor';
  const bloodTypeLabel =
    user?.bloodType && user.bloodType !== 'unknown' ? user.bloodType : 'Not known';

  const handleResponse = async (
    request: Parameters<typeof respondToRequest>[0],
    decision: Parameters<typeof respondToRequest>[1],
  ) => {
    if (respondingRequestId) return;

    setRespondingRequestId(request.id);
    try {
      await respondToRequest(request, decision);
    } catch (responseError) {
      Alert.alert(
        'Response not saved',
        responseError instanceof Error ? responseError.message : 'Please try again.',
      );
    } finally {
      setRespondingRequestId(undefined);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName={`px-5 pb-8 ${Platform.OS === 'android' ? 'pt-7' : 'pt-3'}`}
        ref={scrollRef}
        refreshControl={
          <RefreshControl
            colors={['#8E1722']}
            onRefresh={refresh}
            refreshing={loading}
            tintColor="#8E1722"
          />
        }
        showsVerticalScrollIndicator={false}>
        <DonorHeader
          donorName={firstName}
          hasUnreadNotifications={requests.some((request) => !responseByRequest[request.id])}
          onNotificationsPress={() => router.push('/notifications')}
        />
        <DonorStatusCard
          available={available}
          bloodType={bloodTypeLabel}
          eligible={eligible}
          matchCount={requests.length}
          nextEligibleDate={nextEligibleDate}
          onAvailabilityChange={setAvailable}
          successfulDonations={successfulDonations}
        />
        <UrgentRequestsSection
          disabled={!available || !eligible || loading || Boolean(respondingRequestId)}
          error={error}
          loading={loading}
          onAccept={(request) => void handleResponse(request, 'accepted')}
          onDecline={(request) => void handleResponse(request, 'declined')}
          onRequestPress={(request) => {
            router.push({
              pathname: '/donors/requests/[requestId]',
              params: { requestId: request.id },
            });
          }}
          onRetry={refresh}
          requests={requests}
          responses={responseByRequest}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
