import { Pressable, Text, View } from 'react-native';

import { BloodRequestCard } from './BloodRequestCard';
import type { BloodRequest } from './types';

type UrgentRequestsSectionProps = {
  requests: BloodRequest[];
  onRequestPress?: (request: BloodRequest) => void;
  onSeeAllPress?: () => void;
};

export function UrgentRequestsSection({
  requests,
  onRequestPress,
  onSeeAllPress,
}: UrgentRequestsSectionProps) {
  return (
    <View className="mb-[29px]">
      <View className="mb-[15px] flex-row items-end justify-between">
        <View>
          <Text className="text-[19px] font-bold tracking-[-0.3px] text-ink">Urgent near you</Text>
          <Text className="mt-1 text-xs text-muted">Hospitals looking for your blood type</Text>
        </View>
        <Pressable className="active:opacity-75" hitSlop={10} onPress={onSeeAllPress}>
          <Text className="pb-px text-[13px] font-bold text-blood-red">See all</Text>
        </Pressable>
      </View>

      <View className="gap-[11px]">
        {requests.map((request) => (
          <BloodRequestCard key={request.id} request={request} onPress={onRequestPress} />
        ))}
      </View>
    </View>
  );
}
