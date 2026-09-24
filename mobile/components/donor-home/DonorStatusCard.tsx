import { Pressable, Text, View } from 'react-native';

type DonorStatusCardProps = {
  available: boolean;
  bloodType: string;
  eligible?: boolean;
  matchCount: number;
  nextEligibleDate?: string;
  onAvailabilityChange: (available: boolean) => void;
  successfulDonations?: number;
};

export function DonorStatusCard({
  available,
  bloodType,
  eligible = true,
  matchCount,
  nextEligibleDate,
  onAvailabilityChange,
  successfulDonations = 0,
}: DonorStatusCardProps) {
  return (
    <View className="mb-[30px] overflow-hidden rounded-[25px] bg-ink p-[22px]">
      <View className="absolute -right-[58px] -top-[66px] h-[145px] w-[145px] rounded-full bg-blood-red opacity-20" />
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="mb-2 text-[10px] font-extrabold tracking-[1.4px] text-[#AAA9A6]">
            DONOR STATUS
          </Text>
          <Text className="text-[22px] font-bold tracking-[-0.4px] text-white">
            {eligible ? "You're eligible to donate" : `Next eligible: ${nextEligibleDate ?? 'TBC'}`}
          </Text>
        </View>
        <View className="h-[49px] w-[49px] items-center justify-center rounded-[17px] bg-blood-red">
          <Text className="text-[17px] font-extrabold text-white">{bloodType}</Text>
        </View>
      </View>

      <Text className="mt-[15px] max-w-[88%] text-sm leading-[21px] text-[#B9B9B6]">
        {eligible
          ? `Your profile matches ${matchCount} active requests near you.`
          : 'You can still review nearby requests while you wait.'}
      </Text>

      <View className="mb-[18px] mt-4 flex-row items-center gap-3 rounded-[14px] bg-[#242424] px-4 py-3">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#30302F]">
          <Text className="text-sm font-extrabold text-[#F5A3AA]">{successfulDonations}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs font-bold text-white">
            {successfulDonations === 1 ? 'Confirmed donation' : 'Confirmed donations'}
          </Text>
          <Text className="mt-0.5 text-[9px] text-[#AAA9A6]">Verified by hospital outcomes</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: available, disabled: !eligible }}
        className="flex-row items-center justify-between rounded-[15px] bg-[#242424] px-[15px] py-[13px] active:opacity-75"
        disabled={!eligible}
        onPress={() => onAvailabilityChange(!available)}>
        <View className="flex-row items-center gap-[9px]">
          <View
            className={`h-[9px] w-[9px] rounded-full ${available ? 'bg-[#57B86A]' : 'bg-[#777777]'}`}
          />
          <Text className="text-sm font-semibold text-white">
            {!eligible ? 'Temporarily ineligible' : available ? 'Available to donate' : 'Not available'}
          </Text>
        </View>
        <View
          className={`h-[26px] w-[45px] rounded-[15px] p-[3px] ${available ? 'bg-blood-red' : 'bg-[#555555]'}`}>
          <View
            className={`h-5 w-5 rounded-[10px] bg-white ${available ? 'self-end' : 'self-start'}`}
          />
        </View>
      </Pressable>
    </View>
  );
}
