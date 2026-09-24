import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import type { HospitalRequest, RequestUrgency } from './types';

type ActiveRequestsSectionProps = {
  requests: HospitalRequest[];
  onRequestPress: (request: HospitalRequest) => void;
};

const urgencyClasses: Record<RequestUrgency, string> = {
  Critical: 'bg-blood-red-soft text-blood-red',
  Urgent: 'bg-[#FFF4E8] text-[#9A4F08]',
  Routine: 'bg-[#EFEFED] text-[#62625F]',
};

function ProgressStep({ active, label, value }: { active: boolean; label: string; value: number }) {
  return (
    <View className="items-center">
      <View
        className={`h-7 min-w-[29px] items-center justify-center rounded-lg px-1.5 ${
          active ? 'bg-ink' : 'bg-[#EFEFED]'
        }`}>
        <Text className={`text-[11px] font-extrabold ${active ? 'text-white' : 'text-muted'}`}>
          {value}
        </Text>
      </View>
      <Text className="mt-1 text-[8px] font-semibold text-muted">{label}</Text>
    </View>
  );
}

export function ActiveRequestsSection({ requests, onRequestPress }: ActiveRequestsSectionProps) {
  return (
    <View>
      <View className="mb-3 flex-row items-end justify-between">
        <View>
          <Text className="text-[19px] font-bold tracking-[-0.35px] text-ink">Active requests</Text>
          <Text className="mt-1 text-xs text-muted">Live donor response at a glance</Text>
        </View>
        <Text className="text-xs font-bold text-blood-red">{requests.length} open</Text>
      </View>

      <View className="overflow-hidden rounded-[21px] border border-line bg-card">
        {requests.length === 0 ? (
          <View className="items-center px-6 py-9">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#F1F1EF]">
              <Ionicons color="#737373" name="file-tray-outline" size={22} />
            </View>
            <Text className="mt-3 text-sm font-bold text-ink">No active requests</Text>
            <Text className="mt-1 text-center text-[11px] leading-[17px] text-muted">
              Submitted requests will appear here with live donor progress.
            </Text>
          </View>
        ) : requests.map((request, index) => (
          <Pressable
            accessibilityLabel={`View request ${request.reference}`}
            className={`flex-row items-center gap-3 px-4 py-4 active:bg-[#F8F8F6] ${
              index < requests.length - 1 ? 'border-b border-line' : ''
            }`}
            key={request.id}
            onPress={() => onRequestPress(request)}>
            <View className="h-12 w-12 items-center justify-center rounded-[14px] bg-blood-red-soft">
              <Text className="text-[16px] font-extrabold text-blood-red">{request.bloodType}</Text>
            </View>

            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="shrink text-[13px] font-bold text-ink" numberOfLines={1}>
                  {request.reference} · {request.label}
                </Text>
                <Text
                  className={`rounded-md px-1.5 py-1 text-[8px] font-extrabold ${urgencyClasses[request.urgency]}`}>
                  {request.urgency.toUpperCase()}
                </Text>
              </View>
              <View className="mt-1.5 flex-row items-center gap-1">
                <Ionicons color="#737373" name="time-outline" size={13} />
                <Text className="text-[10px] font-medium text-muted">Posted {request.postedAgo}</Text>
              </View>
            </View>

            <View className="flex-row items-start gap-1">
              <ProgressStep active={request.notified > 0} label="N" value={request.notified} />
              <Text className="mt-1 text-[12px] text-[#C4C4C0]">→</Text>
              <ProgressStep active={request.responded > 0} label="R" value={request.responded} />
              <Text className="mt-1 text-[12px] text-[#C4C4C0]">→</Text>
              <ProgressStep active={request.confirmed > 0} label="C" value={request.confirmed} />
            </View>
          </Pressable>
        ))}
      </View>

      {requests.length > 0 ? (
        <View className="mt-2 flex-row justify-end gap-3 pr-1">
          <Text className="text-[9px] font-semibold text-muted">N · Notified</Text>
          <Text className="text-[9px] font-semibold text-muted">R · Responded</Text>
          <Text className="text-[9px] font-semibold text-muted">C · Confirmed</Text>
        </View>
      ) : null}
    </View>
  );
}
