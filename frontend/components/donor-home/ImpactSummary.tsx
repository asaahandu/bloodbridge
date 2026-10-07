import { Text, View } from 'react-native';

type ImpactSummaryProps = {
  donations: number;
  livesImpacted: number;
  daysUntilEligible: number;
};

type ImpactStatProps = {
  label: string;
  value: number;
};

function ImpactStat({ label, value }: ImpactStatProps) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-[22px] font-extrabold text-ink">
        {String(value).padStart(2, '0')}
      </Text>
      <Text className="mt-1 text-[10px] text-muted">{label}</Text>
    </View>
  );
}

export function ImpactSummary({
  donations,
  livesImpacted,
  daysUntilEligible,
}: ImpactSummaryProps) {
  return (
    <View>
      <Text className="text-[19px] font-bold tracking-[-0.3px] text-ink">Your impact</Text>
      <View className="mt-3.5 flex-row items-center justify-around rounded-[19px] border border-line bg-card py-5">
        <ImpactStat label="Donations" value={donations} />
        <View className="h-[31px] w-px bg-line" />
        <ImpactStat label="Lives impacted" value={livesImpacted} />
        <View className="h-[31px] w-px bg-line" />
        <ImpactStat label="Days to go" value={daysUntilEligible} />
      </View>
    </View>
  );
}
