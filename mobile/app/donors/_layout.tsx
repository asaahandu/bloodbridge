import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

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
              fontSize: 10,
              fontWeight: '700',
              marginTop: 2,
            },
            tabBarStyle: {
              backgroundColor: palette.background,
              borderTopColor: palette.line,
              height: 76,
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
        <AiChatLauncher audience="donor" />
      </View>
    </DonorResponseProvider>
  );
}
