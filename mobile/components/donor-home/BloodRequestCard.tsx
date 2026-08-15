import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { donorHomeColors as colors } from './theme';
import type { BloodRequest } from './types';

type BloodRequestCardProps = {
  request: BloodRequest;
  onPress?: (request: BloodRequest) => void;
};

export function BloodRequestCard({ request, onPress }: BloodRequestCardProps) {
  return (
    <Pressable
      className="flex-row items-center rounded-[19px] border border-line bg-card p-3.5 active:opacity-75"
      onPress={() => onPress?.(request)}>
      <View className="h-[66px] w-[66px] items-center justify-center rounded-[15px] bg-blood-red-soft">
        <Text className="text-[21px] font-extrabold text-blood-red">{request.bloodType}</Text>
        <Text className="mt-px text-[7px] font-extrabold tracking-[1.1px] text-[#A15D63]">
          BLOOD
        </Text>
      </View>

      <View className="ml-3.5 flex-1">
        <View className="flex-row items-center gap-[7px]">
          <Text className="shrink text-sm font-bold text-ink" numberOfLines={1}>
            {request.hospital}
          </Text>
          {request.urgent ? (
            <View className="flex-row items-center gap-1 rounded-[9px] bg-blood-red-soft px-1.5 py-1">
              <View className="h-[5px] w-[5px] rounded-full bg-blood-red" />
              <Text className="text-[7px] font-black tracking-[0.7px] text-blood-red">
                URGENT
              </Text>
            </View>
          ) : null}
        </View>
        <View className="mt-1.5 flex-row items-center gap-[3px]">
          <Ionicons name="location-outline" size={14} color={colors.muted} />
          <Text className="flex-1 text-[11px] text-muted" numberOfLines={1}>
            {request.location} · {request.distance}
          </Text>
        </View>
        <View className="mt-2 flex-row items-center gap-1">
          <Text className="text-[11px] font-bold text-blood-red">You’re a match</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.red} />
        </View>
      </View>
    </Pressable>
  );
}
