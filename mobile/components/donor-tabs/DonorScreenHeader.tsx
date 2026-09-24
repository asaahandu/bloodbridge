import { Text, View } from 'react-native';

type DonorScreenHeaderProps = {
  subtitle: string;
  title: string;
};

export function DonorScreenHeader({ subtitle, title }: DonorScreenHeaderProps) {
  return (
    <View>
      <Text className="text-[11px] font-extrabold tracking-[1.4px] text-blood-red">
        DONOR DASHBOARD
      </Text>
      <Text className="mt-1 text-[27px] font-bold tracking-[-0.6px] text-ink">{title}</Text>
      <Text className="mt-1 text-xs leading-[18px] text-muted">{subtitle}</Text>
    </View>
  );
}
