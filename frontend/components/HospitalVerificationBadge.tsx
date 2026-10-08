import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import type { HospitalVerificationStatus } from '@/lib/api';

export function HospitalVerificationBadge({
  inverse = false,
  status,
}: {
  inverse?: boolean;
  status?: HospitalVerificationStatus;
}) {
  const verified = status === 'verified';
  return (
    <View
      accessibilityLabel={verified ? 'Verified hospital' : 'Unverified hospital'}
      accessible
      className="flex-row items-center gap-1">
      {verified ? (
        <Ionicons color={inverse ? '#73C59F' : '#26735A'} name="checkmark-circle" size={15} />
      ) : (
        <Text className={`text-[9px] font-bold ${inverse ? 'text-[#AFAFAC]' : 'text-[#817976]'}`}>
          Unverified
        </Text>
      )}
    </View>
  );
}
