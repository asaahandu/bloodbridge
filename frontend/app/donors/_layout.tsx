import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AiChatLauncher } from '@/components/ai-chat';
import { DonorResponseProvider } from '@/components/donor-tabs';
import { PushNotificationRegistrar } from '@/components/notifications/PushNotificationRegistrar';

const palette = {
  active: '#8E1722',
  background: '#FFFFFF',
  inactive: '#8B8B88',
  line: '#E7E6E2',
};

export default function DonorTabsLayout() {
  const pathname = usePathname();
  const isMessagesRoute = pathname.endsWith('/messages');

  return (
    <DonorResponseProvider>
      <PushNotificationRegistrar />
      <View className="flex-1">
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: palette.active,
            tabBarInactiveTintColor: palette.inactive,
            tabBarHideOnKeyboard: true,
            tabBarLabelStyle: {
              fontSize: 8.5,
              fontWeight: '700',
              marginTop: 2,
            },
            tabBarStyle: {
              backgroundColor: palette.background,
              borderTopColor: palette.line,
              height: 80,
              overflow: 'visible',
              paddingBottom: 10,
              paddingTop: 8,
            },
          }}>
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarAccessibilityLabel: 'Donor home',
              tabBarIcon: ({ color, focused }) => (
                <Ionicons color={color} name={focused ? 'home' : 'home-outline'} size={22} />
              ),
            }}
          />
          <Tabs.Screen
            name="activity"
            options={{
              title: 'Activity',
              tabBarAccessibilityLabel: 'Donation request activity',
              tabBarIcon: ({ color, focused }) => (
                <Ionicons color={color} name={focused ? 'time' : 'time-outline'} size={23} />
              ),
            }}
          />
          <Tabs.Screen
            name="find"
            options={{
              title: 'Find',
              tabBarAccessibilityLabel: 'Find donation centres and campaigns',
              tabBarButton: ({
                accessibilityLabel,
                accessibilityState,
                onLongPress,
                onPress,
                testID,
              }) => (
                <Pressable
                  accessibilityLabel={accessibilityLabel}
                  accessibilityRole="button"
                  accessibilityState={accessibilityState}
                  className="-mt-[18px] flex-1 items-center justify-center active:opacity-80"
                  onLongPress={onLongPress}
                  onPress={onPress}
                  testID={testID}>
                  <View
                    className={`h-[62px] w-[62px] items-center justify-center rounded-full border-4 border-white shadow-xl ${
                      accessibilityState?.selected ? 'bg-blood-red-dark' : 'bg-blood-red'
                    }`}>
                    <Ionicons color="#FFFFFF" name="search" size={25} />
                  </View>
                  <Text
                    className={`mt-1 text-[8.5px] font-extrabold ${
                      accessibilityState?.selected ? 'text-blood-red' : 'text-muted'
                    }`}>
                    Find
                  </Text>
                </Pressable>
              ),
            }}
          />
          <Tabs.Screen name="centre" options={{ href: null }} />
          <Tabs.Screen name="campaign" options={{ href: null }} />
          <Tabs.Screen
            name="messages"
            options={{
              title: 'Messages',
              tabBarAccessibilityLabel: 'Messages',
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  color={color}
                  name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                  size={22}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarAccessibilityLabel: 'Donor profile and settings',
              tabBarIcon: ({ color, focused }) => (
                <Ionicons color={color} name={focused ? 'person' : 'person-outline'} size={22} />
              ),
            }}
          />
        </Tabs>
        {isMessagesRoute ? null : <AiChatLauncher audience="donor" />}
      </View>
    </DonorResponseProvider>
  );
}
