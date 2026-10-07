import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AiChatLauncher } from '@/components/ai-chat';
import { PushNotificationRegistrar } from '@/components/notifications/PushNotificationRegistrar';

const palette = {
  active: '#8E1722',
  background: '#FFFFFF',
  inactive: '#8B8B88',
  line: '#E7E6E2',
};

export default function HospitalTabsLayout() {
  const pathname = usePathname();
  const isMessagesRoute = pathname.endsWith('/messages');

  return (
    <View className="flex-1">
      <PushNotificationRegistrar />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: palette.active,
          tabBarInactiveTintColor: palette.inactive,
          tabBarHideOnKeyboard: true,
          tabBarItemStyle: { paddingHorizontal: 0 },
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
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'grid' : 'grid-outline'} size={21} />
          ),
        }}
      />
      <Tabs.Screen
        name="active-requests"
        options={{
          title: 'Active requests',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? 'file-tray-full' : 'file-tray-full-outline'}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="new-request"
        options={{
          title: 'New request',
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
                <Ionicons color="#FFFFFF" name="add" size={31} />
              </View>
              <Text
                className={`mt-1 text-[8.5px] font-extrabold ${
                  accessibilityState?.selected ? 'text-blood-red' : 'text-muted'
                }`}>
                New request
              </Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={21}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'person' : 'person-outline'} size={21} />
          ),
        }}
      />
      </Tabs>
      {isMessagesRoute ? null : <AiChatLauncher audience="hospital" />}
    </View>
  );
}
