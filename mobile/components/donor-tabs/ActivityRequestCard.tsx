import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import type { DonorResponse } from './DonorResponseContext';

type ActivityRequestCardProps = {
  onScreeningPress?: () => void;
  response: DonorResponse;
};

export function ActivityRequestCard({ onScreeningPress, response }: ActivityRequestCardProps) {
  const accepted = response.decision === 'accepted';
  const completed = response.outcome === 'completed';
  const noShow = response.outcome === 'no_show';
  const confirmed = Boolean(response.confirmedAt);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(response.respondedAt);
  const outcomeDate = response.outcomeRecordedAt
    ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(
        response.outcomeRecordedAt,
      )
    : undefined;
  const badgeLabel = completed
    ? 'Completed'
    : noShow
      ? 'No-show'
      : confirmed
        ? 'Confirmed'
        : accepted
          ? 'Accepted'
          : 'Not available';
  const badgeIcon = completed
    ? 'checkmark-done-circle'
    : noShow
      ? 'close-circle-outline'
      : confirmed
        ? 'shield-checkmark'
        : accepted
          ? 'checkmark-circle'
          : 'remove-circle-outline';
  const positiveStatus = !noShow && (completed || confirmed || accepted);

  return (
    <View className="rounded-[19px] border border-line bg-card p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-[14px] bg-blood-red-soft">
          <Text className="text-[15px] font-extrabold text-blood-red">
            {response.request.bloodType}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-bold text-ink">{response.request.hospital}</Text>
          <Text className="mt-1 text-[10px] text-muted">
            {response.request.location} · {response.request.distance}
          </Text>
        </View>
        <View
          className={`flex-row items-center gap-1 rounded-lg px-2 py-1.5 ${
            completed || (accepted && !noShow) ? 'bg-success-soft' : 'bg-[#EFEFED]'
          }`}>
          <Ionicons
            color={positiveStatus ? '#1F6A4C' : '#737373'}
            name={badgeIcon}
            size={13}
          />
          <Text
            className={`text-[9px] font-bold ${positiveStatus ? 'text-success' : 'text-muted'}`}>
            {badgeLabel}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between border-t border-line pt-3">
        <Text className="text-[10px] text-muted">Responded at {time}</Text>
        <Text
          className={`max-w-[58%] text-right text-[10px] font-semibold ${
            completed ? 'text-success' : confirmed && !noShow ? 'text-blood-red' : 'text-muted'
          }`}>
          {completed
            ? `Donation verified${outcomeDate ? ` · ${outcomeDate}` : ''}`
            : noShow
              ? 'Hospital recorded a no-show'
              : confirmed
                ? 'Awaiting donation outcome'
                : accepted
                  ? 'Awaiting hospital confirmation'
                  : 'No further action'}
        </Text>
      </View>

      {accepted && !response.outcome && onScreeningPress ? (
        <Pressable
          accessibilityHint="Starts or resumes your request eligibility screening"
          accessibilityRole="button"
          className="mt-3 h-11 flex-row items-center justify-center rounded-[13px] bg-ink active:opacity-80"
          onPress={onScreeningPress}>
          <Ionicons color="#FFFFFF" name="chatbubble-ellipses-outline" size={16} />
          <Text className="ml-2 text-[10px] font-extrabold text-white">
            OPEN ELIGIBILITY SCREENING
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
