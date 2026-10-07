import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { BloodRequestCard } from './BloodRequestCard';
import type { BloodRequest } from './types';

type UrgentRequestsSectionProps = {
  disabled?: boolean;
  error?: string;
  loading?: boolean;
  onAccept?: (request: BloodRequest) => void;
  onDecline?: (request: BloodRequest) => void;
  onRetry?: () => void;
  requests: BloodRequest[];
  onRequestPress?: (request: BloodRequest) => void;
  onSeeAllPress?: () => void;
  responses?: Record<string, 'accepted' | 'declined'>;
};

export function UrgentRequestsSection({
  disabled,
  error,
  loading,
  onAccept,
  onDecline,
  onRetry,
  requests,
  onRequestPress,
  onSeeAllPress,
  responses,
}: UrgentRequestsSectionProps) {
  return (
    <View className="mb-[29px]">
      <View className="mb-[15px] flex-row items-end justify-between">
        <View>
          <Text className="text-[19px] font-bold tracking-[-0.3px] text-ink">Requests near you</Text>
          <Text className="mt-1 text-xs text-muted">Matched by blood type, urgency, and distance</Text>
        </View>
        {onSeeAllPress && requests.length > 0 ? (
          <Pressable className="active:opacity-75" hitSlop={10} onPress={onSeeAllPress}>
            <Text className="pb-px text-[13px] font-bold text-blood-red">See all</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="gap-[11px]">
        {loading ? (
          <View className="flex-row items-center gap-3 rounded-[19px] border border-line bg-card p-5">
            <ActivityIndicator color="#8E1722" size="small" />
            <View className="flex-1">
              <Text className="text-xs font-bold text-ink">Finding matching requests</Text>
              <Text className="mt-1 text-[10px] text-muted">Checking active hospital requests…</Text>
            </View>
          </View>
        ) : error ? (
          <View className="rounded-[19px] border border-[#F2D1D3] bg-error-soft p-5">
            <View className="flex-row items-start gap-3">
              <Ionicons color="#B42318" name="cloud-offline-outline" size={21} />
              <View className="flex-1">
                <Text className="text-xs font-bold text-error">Requests could not be loaded</Text>
                <Text className="mt-1 text-[10px] leading-[15px] text-error">{error}</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              className="mt-3 self-start rounded-xl bg-blood-red px-4 py-2.5 active:bg-blood-red-dark"
              onPress={onRetry}>
              <Text className="text-[10px] font-extrabold text-white">TRY AGAIN</Text>
            </Pressable>
          </View>
        ) : requests.length === 0 ? (
          <View className="items-center rounded-[19px] border border-line bg-card px-6 py-9">
            <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-[#EFEFED]">
              <Ionicons color="#737373" name="water-outline" size={24} />
            </View>
            <Text className="mt-3 text-sm font-bold text-ink">No active matches</Text>
            <Text className="mt-1 max-w-[260px] text-center text-[11px] leading-[17px] text-muted">
              New hospital requests matching your blood type will appear here.
            </Text>
          </View>
        ) : (
          requests.map((request) => (
            <BloodRequestCard
              disabled={disabled}
              key={request.id}
              onAccept={onAccept}
              onDecline={onDecline}
              onPress={onRequestPress}
              request={request}
              response={responses?.[request.id]}
            />
          ))
        )}
      </View>
    </View>
  );
}
