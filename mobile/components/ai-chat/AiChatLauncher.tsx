import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export type AiChatAudience = 'donor' | 'hospital';

type AiChatLauncherProps = {
  audience: AiChatAudience;
};

export function AiChatLauncher({ audience }: AiChatLauncherProps) {
  return (
    <View className="absolute bottom-[94px] right-5 z-50" pointerEvents="box-none">
      <Link
        asChild
        href={{
          pathname: '/ai-chat',
          params: { audience },
        }}>
        <Pressable
          accessibilityHint="Opens the BloodBridge AI chatbot"
          accessibilityLabel="Open AI assistant"
          accessibilityRole="button"
          className="h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-blood-red bg-ink active:scale-95 active:opacity-90"
          style={{
            elevation: 10,
            shadowColor: '#121212',
            shadowOffset: { height: 5, width: 0 },
            shadowOpacity: 0.24,
            shadowRadius: 8,
          }}>
          <Ionicons color="#FFFFFF" name="chatbubble-ellipses" size={26} />
          <View className="absolute -right-1 -top-1 min-w-[24px] items-center rounded-full border-2 border-canvas bg-blood-red px-1.5 py-0.5">
            <Text className="text-[8px] font-black tracking-[0.5px] text-white">AI</Text>
          </View>
        </Pressable>
      </Link>
    </View>
  );
}
