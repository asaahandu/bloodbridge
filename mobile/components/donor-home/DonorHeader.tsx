import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { donorHomeColors as colors } from './theme';

type DonorHeaderProps = {
  donorName: string;
  hasUnreadNotifications?: boolean;
  onNotificationsPress?: () => void;
};

export function DonorHeader({
  donorName,
  hasUnreadNotifications = true,
  onNotificationsPress,
}: DonorHeaderProps) {
  return (
    <View className="mb-6 flex-row items-center justify-between">
      <View>
        <View className="mb-2 flex-row items-center gap-2">
          <View className="h-[26px] w-[26px] items-center justify-center rounded-lg bg-blood-red">
            <Ionicons name="water" size={16} color="#FFFFFF" />
          </View>
          <Text className="text-base font-extrabold tracking-[1.7px] text-blood-red">
            BLOODBRIDGE
          </Text>
          <Text className="text-[11px] font-semibold text-muted">|</Text>
          <Text className="text-[10px] font-bold tracking-[1px] text-muted">
            DONOR DASHBOARD
          </Text>
        </View>
        <Text className="text-[25px] font-bold tracking-[-0.6px] text-ink">
          Good morning, {donorName}
        </Text>
      </View>

      <Pressable
        accessibilityLabel="Open notifications"
        className="h-12 w-12 items-center justify-center rounded-2xl border border-line bg-card active:opacity-75"
        hitSlop={8}
        onPress={onNotificationsPress}>
        <Ionicons name="notifications-outline" size={23} color={colors.black} />
        {hasUnreadNotifications ? (
          <View className="absolute right-[11px] top-2.5 h-[9px] w-[9px] rounded-full border-2 border-card bg-blood-red" />
        ) : null}
      </Pressable>
    </View>
  );
}
