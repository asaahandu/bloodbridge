import { Stack } from 'expo-router';

export default function HospitalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="requests/[requestId]" />
      <Stack.Screen name="donors/[donorId]" />
    </Stack>
  );
}
