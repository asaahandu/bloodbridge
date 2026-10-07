import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { Platform, Text, View } from 'react-native';

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-card p-6">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blood-red-soft">
        <Ionicons name="information-circle-outline" size={28} color="#8E1722" />
      </View>
      <Text className="mt-5 text-xl font-extrabold text-ink">BloodBridge</Text>
      <Text className="mt-2 max-w-[300px] text-center text-sm leading-[21px] text-muted">
        Your donor activity and nearby hospital requests stay together in one place.
      </Text>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}
