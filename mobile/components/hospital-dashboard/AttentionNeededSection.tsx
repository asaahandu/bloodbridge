import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import type { HospitalRequest } from './types';

type AttentionNeededSectionProps = {
  requests: HospitalRequest[];
  onRequestPress: (request: HospitalRequest) => void;
};

const reasonLabels = {
  critical: 'CRITICAL',
  stalled: 'STALLED',
  'awaiting-confirmation': 'AWAITING CONFIRMATION',
} as const;

export function AttentionNeededSection({
  requests,
  onRequestPress,
}: AttentionNeededSectionProps) {
  return (
    <View className="rounded-[24px] bg-ink p-5">
      <View className="mb-4 flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <View className="mb-2 flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-[#E04D58]" />
            <Text className="text-[11px] font-extrabold tracking-[1.5px] text-[#F5A3AA]">
              ATTENTION NEEDED
            </Text>
          </View>
          <Text className="text-[20px] font-bold tracking-[-0.4px] text-white">
            Staff action required
          </Text>
          <Text className="mt-1 text-xs leading-[18px] text-[#AFAFAC]">
            Only requests that may need intervention are shown here.
          </Text>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#2A2A2A]">
          <Ionicons color="#F5A3AA" name="alert-circle-outline" size={22} />
        </View>
      </View>

      <View className="gap-2.5">
        {requests.length === 0 ? (
          <View className="flex-row items-center gap-3 rounded-[17px] border border-[#343434] bg-[#202020] p-4">
            <Ionicons color="#73C59F" name="checkmark-circle-outline" size={21} />
            <View className="flex-1">
              <Text className="text-xs font-bold text-white">No intervention needed</Text>
              <Text className="mt-1 text-[10px] leading-[15px] text-[#AFAFAC]">
                All open requests are currently within their expected response window.
              </Text>
            </View>
          </View>
        ) : requests.map((request) => (
          <Pressable
            accessibilityLabel={`Open ${request.reference}`}
            className="rounded-[17px] border border-[#343434] bg-[#202020] p-4 active:opacity-75"
            key={request.id}
            onPress={() => onRequestPress(request)}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <View className="mb-2 flex-row flex-wrap items-center gap-2">
                  <View className="rounded-lg bg-blood-red px-2 py-1">
                    <Text className="text-[9px] font-black tracking-[0.8px] text-white">
                      {reasonLabels[request.attentionReason ?? 'critical']}
                    </Text>
                  </View>
                  <Text className="text-[11px] font-bold text-[#AFAFAC]">
                    {request.reference} · {request.postedAgo}
                  </Text>
                </View>
                <Text className="text-[15px] font-bold text-white">
                  {request.bloodType} · {request.label}
                </Text>
                <Text className="mt-1 text-xs leading-[18px] text-[#CBCBC7]">
                  {request.attentionMessage}
                </Text>
              </View>
              <Ionicons color="#F5A3AA" name="chevron-forward" size={19} />
            </View>

            <View className="mt-3 flex-row items-center gap-2">
              <Text className="text-[10px] font-semibold text-[#92928E]">
                {request.notified} notified
              </Text>
              <View className="h-1 w-1 rounded-full bg-[#555552]" />
              <Text className="text-[10px] font-semibold text-[#92928E]">
                {request.responded} responded
              </Text>
              <View className="h-1 w-1 rounded-full bg-[#555552]" />
              <Text className="text-[10px] font-bold text-[#F5A3AA]">
                {request.confirmed} confirmed
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
