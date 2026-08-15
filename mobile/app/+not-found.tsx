import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <View className="flex-1 items-center justify-center bg-canvas p-5">
        <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-blood-red-soft">
          <Ionicons name="navigate-outline" size={29} color="#8E1722" />
        </View>
        <Text className="mt-5 text-2xl font-extrabold text-ink">This page isn’t here</Text>
        <Text className="mt-2 text-center text-sm text-muted">
          The link may be old or the page may have moved.
        </Text>
        <Link asChild href="/">
          <Pressable className="mt-6 rounded-[14px] bg-ink px-5 py-3.5 active:opacity-75">
            <Text className="font-bold text-white">Return to BloodBridge</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}
