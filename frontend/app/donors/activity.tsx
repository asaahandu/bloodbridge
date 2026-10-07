import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActivityRequestCard,
  DonorScreenHeader,
  useDonorResponses,
} from '@/components/donor-tabs';

import type { DonorResponse } from '@/components/donor-tabs/DonorResponseContext';

function EmptyActivity({ accepted, completed }: { accepted?: boolean; completed?: boolean }) {
  return (
    <View className="items-center rounded-[21px] border border-line bg-card px-6 py-9">
      <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-[#EFEFED]">
        <Ionicons
          color="#737373"
          name={completed ? 'ribbon-outline' : accepted ? 'checkmark-done-outline' : 'time-outline'}
          size={24}
        />
      </View>
      <Text className="mt-3 text-sm font-bold text-ink">
        {completed ? 'No completed donations yet' : accepted ? 'No active commitment' : 'No activity yet'}
      </Text>
      <Text className="mt-1 max-w-[260px] text-center text-[11px] leading-[17px] text-muted">
        {completed
          ? 'Hospital-verified donations will appear here automatically.'
          : accepted
            ? 'Accepted requests will stay here until the hospital records an outcome.'
            : 'Requests you decline or miss will appear here.'}
      </Text>
    </View>
  );
}

function StatusTracker({ response }: { response: DonorResponse }) {
  const steps = ['Accepted', 'Hospital confirmed', 'Completed'];
  const completedSteps =
    response.outcome === 'completed' ? 3 : response.confirmedAt ? 2 : 1;

  return (
    <View className="mt-3 rounded-[17px] bg-ink px-4 py-4">
      <Text className="mb-3 text-[10px] font-extrabold tracking-[1px] text-[#AFAFAC]">
        DONATION STATUS
      </Text>
      <View className="flex-row items-start">
        {steps.map((step, index) => (
          <View className="flex-1" key={step}>
            <View className="flex-row items-center">
              <View
                className={`h-3 w-3 rounded-full border-2 ${
                  index < completedSteps
                    ? 'border-blood-red bg-blood-red'
                    : 'border-[#676764] bg-ink'
                }`}
              />
              {index < steps.length - 1 ? <View className="h-px flex-1 bg-[#4B4B49]" /> : null}
            </View>
            <Text
              className={`mt-2 text-[9px] ${
                index < completedSteps ? 'font-bold text-white' : 'text-[#92928F]'
              }`}>
              {step}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function DonorActivityScreen() {
  const router = useRouter();
  const { error, loading, refresh, responses } = useDonorResponses();
  const openEligibilityScreening = (requestId: string) => {
    router.navigate({
      pathname: '/ai-chat',
      params: { audience: 'donor', mode: 'eligibility', requestId },
    });
  };
  const activeResponses = responses.filter(
    (response) => response.decision === 'accepted' && !response.outcome,
  );
  const completedResponses = responses.filter((response) => response.outcome === 'completed');
  const recentResponses = responses.filter(
    (response) => response.decision === 'declined' || response.outcome === 'no_show',
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-5"
        refreshControl={
          <RefreshControl
            colors={['#8E1722']}
            onRefresh={refresh}
            refreshing={loading}
            tintColor="#8E1722"
          />
        }
        showsVerticalScrollIndicator={false}>
        <DonorScreenHeader
          subtitle="Follow accepted requests and review your recent decisions."
          title="Your activity"
        />

        {error ? (
          <View className="mt-5 rounded-[17px] border border-[#F2D1D3] bg-error-soft p-4">
            <Text className="text-xs font-bold text-error">Activity could not be refreshed</Text>
            <Text className="mt-1 text-[10px] leading-[15px] text-error">{error}</Text>
            <Pressable className="mt-3 self-start active:opacity-70" onPress={() => void refresh()}>
              <Text className="text-[10px] font-extrabold text-error">TRY AGAIN</Text>
            </Pressable>
          </View>
        ) : null}

        <Text className="mb-3 mt-7 text-[17px] font-bold text-ink">Active response</Text>
        {activeResponses.length === 0 ? (
          <EmptyActivity accepted />
        ) : (
          <View className="gap-3">
            {activeResponses.map((response) => (
              <View key={response.request.id}>
                <ActivityRequestCard
                  onScreeningPress={() => openEligibilityScreening(response.request.id)}
                  response={response}
                />
                <StatusTracker response={response} />
              </View>
            ))}
          </View>
        )}

        <Text className="mb-3 mt-7 text-[17px] font-bold text-ink">Completed donations</Text>
        {completedResponses.length === 0 ? (
          <EmptyActivity completed />
        ) : (
          <View className="gap-3">
            {completedResponses.map((response) => (
              <View key={response.request.id}>
                <ActivityRequestCard response={response} />
                <StatusTracker response={response} />
              </View>
            ))}
          </View>
        )}

        <Text className="mb-3 mt-7 text-[17px] font-bold text-ink">Recent decisions</Text>
        {recentResponses.length === 0 ? (
          <EmptyActivity />
        ) : (
          <View className="gap-3">
            {recentResponses.map((response) => (
              <ActivityRequestCard key={response.request.id} response={response} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
