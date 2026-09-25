import '@/lib/background-location';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import 'react-native-reanimated';
import '../global.css';

import { LocationTracker } from '@/components/location/LocationTracker';
import { useColorScheme } from '@/components/useColorScheme';

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LocationTracker />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login/index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up/index" options={{ headerShown: false }} />
        <Stack.Screen name="location-setup/index" options={{ headerShown: false }} />
        <Stack.Screen name="donors" options={{ headerShown: false }} />
        <Stack.Screen name="hospitals" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="ai-chat/index" options={{ headerShown: false }} />
        <Stack.Screen name="modal/index" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
