import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView, Text, View } from 'react-native';

export default function RequestsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-1 px-5 pt-8">
        <Text className="text-xs font-extrabold uppercase tracking-[1.5px] text-blood-red">
          Blood requests
        </Text>
        <Text className="mt-2 text-[30px] font-extrabold tracking-[-0.8px] text-ink">
          Nearby matches
        </Text>
        <Text className="mt-2 max-w-[420px] text-sm leading-[21px] text-muted">
          Urgent and compatible requests will appear here as hospitals publish them.
        </Text>

        <View className="mt-8 items-center rounded-3xl border border-line bg-card px-6 py-12">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blood-red-soft">
            <Ionicons name="heart-outline" size={26} color="#8E1722" />
          </View>
          <Text className="mt-5 text-lg font-bold text-ink">You’re all caught up</Text>
          <Text className="mt-2 max-w-[280px] text-center text-[13px] leading-5 text-muted">
            We’ll notify you when a hospital nearby needs your blood type.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
