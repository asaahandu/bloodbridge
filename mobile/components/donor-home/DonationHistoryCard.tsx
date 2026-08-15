import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { donorHomeColors as colors } from './theme';

type DonationHistoryCardProps = {
  date: string;
  hospital: string;
  onPress?: () => void;
};

export function DonationHistoryCard({ date, hospital, onPress }: DonationHistoryCardProps) {
  return (
    <Pressable
      className="mt-3 flex-row items-center rounded-[18px] border border-line bg-card p-3.5 active:opacity-75"
      onPress={onPress}>
      <View className="h-[43px] w-[43px] items-center justify-center rounded-[13px] bg-[#EEEEEB]">
        <Ionicons name="calendar-clear-outline" size={21} color={colors.black} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[13px] font-bold text-ink">Last donation</Text>
        <Text className="mt-[3px] text-[11px] text-muted">
          {date} · {hospital}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color="#A1A1A1" />
    </Pressable>
  );
}
