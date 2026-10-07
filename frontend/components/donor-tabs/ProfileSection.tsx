import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type ProfileSectionProps = {
  children: ReactNode;
  description?: string;
  title: string;
};

export function ProfileSection({ children, description, title }: ProfileSectionProps) {
  return (
    <View className="mt-7">
      <Text className="text-[17px] font-bold text-ink">{title}</Text>
      {description ? (
        <Text className="mb-3 mt-1 text-[10px] leading-[15px] text-muted">{description}</Text>
      ) : (
        <View className="h-3" />
      )}
      <View className="overflow-hidden rounded-[21px] border border-line bg-card px-4">
        {children}
      </View>
    </View>
  );
}
