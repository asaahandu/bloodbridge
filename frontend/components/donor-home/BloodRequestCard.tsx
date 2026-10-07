import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { donorHomeColors as colors } from './theme';
import type { BloodRequest } from './types';

type BloodRequestCardProps = {
  disabled?: boolean;
  onAccept?: (request: BloodRequest) => void;
  onDecline?: (request: BloodRequest) => void;
  onPress?: (request: BloodRequest) => void;
  request: BloodRequest;
  response?: 'accepted' | 'declined';
};

export function BloodRequestCard({
  disabled,
  onAccept,
  onDecline,
  onPress,
  request,
  response,
}: BloodRequestCardProps) {
  const urgency = request.urgency ?? (request.urgent ? 'urgent' : 'standard');

  return (
    <View className="rounded-[19px] border border-line bg-card p-3.5">
      <Pressable className="flex-row items-center active:opacity-75" onPress={() => onPress?.(request)}>
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
            {urgency !== 'standard' ? (
              <View className="flex-row items-center gap-1 rounded-[9px] bg-blood-red-soft px-1.5 py-1">
                <View className="h-[5px] w-[5px] rounded-full bg-blood-red" />
                <Text className="text-[7px] font-black tracking-[0.7px] text-blood-red">
                  {urgency.toUpperCase()}
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
            <Text className="text-[11px] font-bold text-blood-red">
              {request.neededBy ? `Needed ${request.neededBy}` : "You're a match"}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.red} />
          </View>
        </View>
      </Pressable>

      {response ? (
        <Pressable
          accessibilityHint={response === 'accepted' ? 'Opens eligibility screening' : undefined}
          accessibilityRole={response === 'accepted' ? 'button' : undefined}
          className={`mt-3 flex-row items-center justify-center gap-2 rounded-[13px] px-3 py-3 ${
            response === 'accepted' ? 'bg-success-soft' : 'bg-[#EFEFED]'
          }`}
          disabled={response !== 'accepted' || !onPress}
          onPress={() => onPress?.(request)}>
          <Ionicons
            color={response === 'accepted' ? '#1F6A4C' : '#737373'}
            name={response === 'accepted' ? 'checkmark-circle' : 'remove-circle-outline'}
            size={17}
          />
          <Text
            className={`text-[11px] font-bold ${
              response === 'accepted' ? 'text-success' : 'text-muted'
            }`}>
            {response === 'accepted'
              ? 'Accepted · Open eligibility screening'
              : 'Marked not available'}
          </Text>
        </Pressable>
      ) : (
        <View className="mt-3 flex-row gap-2 border-t border-line pt-3">
          <Pressable
            accessibilityLabel={`Accept request from ${request.hospital}`}
            accessibilityRole="button"
            className="h-11 flex-1 items-center justify-center rounded-[13px] bg-blood-red active:bg-blood-red-dark disabled:opacity-40"
            disabled={disabled}
            onPress={() => onAccept?.(request)}>
            <Text className="text-[11px] font-extrabold text-white">Accept</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Decline request from ${request.hospital}`}
            accessibilityRole="button"
            className="h-11 flex-1 items-center justify-center rounded-[13px] border border-line bg-field active:opacity-70"
            onPress={() => onDecline?.(request)}>
            <Text className="text-[11px] font-bold text-ink">Not available</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
