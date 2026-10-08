import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

export function SupportChatLauncher() {
  return (
    <View className="absolute bottom-[166px] right-5 z-50" pointerEvents="box-none">
      <Link asChild href="/support">
        <Pressable
          accessibilityHint="Opens a conversation with BloodBridge customer support"
          accessibilityLabel="Contact customer support"
          accessibilityRole="button"
          className="h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-blood-red bg-ink active:scale-95 active:opacity-90"
          style={{
            elevation: 10,
            shadowColor: '#121212',
            shadowOffset: { height: 5, width: 0 },
            shadowOpacity: 0.24,
            shadowRadius: 8,
          }}>
          <Ionicons color="#FFFFFF" name="headset" size={26} />
        </Pressable>
      </Link>
    </View>
  );
}
