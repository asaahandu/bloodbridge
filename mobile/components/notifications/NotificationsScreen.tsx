import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    listNotifications,
    markNotificationsRead,
    type AppNotification,
} from '@/lib/api';
import { getAuthenticatedUser } from '@/lib/auth-session';

type NotificationAudience = 'donor' | 'hospital';

function formatNotificationDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [audience, setAudience] = useState<NotificationAudience>('donor');

  const loadNotifications = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const session = await getAuthenticatedUser();
      if (!session) throw new Error('Please sign in to view notifications.');
      setAudience(session.role);
      const result = await listNotifications(session.authToken);
      setNotifications(result.notifications);
      await markNotificationsRead(session.authToken);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-5"
        refreshControl={
          <RefreshControl
            colors={['#8E1722']}
            onRefresh={() => void loadNotifications(true)}
            refreshing={refreshing}
            tintColor="#8E1722"
          />
        }
        showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-[11px] font-extrabold tracking-[1.4px] text-blood-red">
              BLOODBRIDGE
            </Text>
            <Text className="mt-1 text-[27px] font-bold tracking-[-0.6px] text-ink">
              Notifications
            </Text>
            <Text className="mt-1 text-xs leading-[18px] text-muted">
              Request updates and alerts for your account.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close notifications"
            className="h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card active:opacity-70"
            hitSlop={8}
            onPress={() => router.back()}>
            <Ionicons color="#121212" name="close" size={22} />
          </Pressable>
        </View>

        {loading ? (
          <View className="mt-8 items-center py-8">
            <ActivityIndicator color="#8E1722" />
          </View>
        ) : error ? (
          <View className="mt-7 rounded-[18px] bg-error-soft p-4">
            <Text className="text-xs font-bold text-error">Notifications could not be loaded</Text>
            <Text className="mt-1 text-[11px] leading-[17px] text-error">{error}</Text>
            <Pressable className="mt-3 self-start" onPress={() => void loadNotifications()}>
              <Text className="text-[10px] font-extrabold text-error">TRY AGAIN</Text>
            </Pressable>
          </View>
        ) : notifications.length === 0 ? (
          <View className="mt-7 items-center rounded-[21px] border border-line bg-card px-6 py-12">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blood-red-soft">
              <Ionicons color="#8E1722" name="notifications-outline" size={26} />
            </View>
            <Text className="mt-4 text-sm font-bold text-ink">You are all caught up</Text>
            <Text className="mt-1 text-center text-[11px] leading-[17px] text-muted">
              New blood request updates will appear here.
            </Text>
          </View>
        ) : (
          <View className="mt-7 gap-3">
            {notifications.map((notification) => (
              <Pressable
                className="flex-row gap-3 rounded-[19px] border border-line bg-card p-4 active:opacity-80"
                key={notification.id}
                onPress={() => router.push(audience === 'hospital' ? '/hospitals' : '/donors')}>
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-blood-red-soft">
                  <Ionicons color="#8E1722" name="water-outline" size={19} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-start justify-between gap-2">
                    <Text className="flex-1 text-sm font-bold text-ink">{notification.title}</Text>
                    <Text className="text-[9px] font-semibold text-muted">
                      {formatNotificationDate(notification.createdAt)}
                    </Text>
                  </View>
                  <Text className="mt-1 text-[11px] leading-[17px] text-muted">
                    {notification.body}
                  </Text>
                  {notification.matchRank ? (
                    <Text className="mt-2 text-[10px] font-extrabold text-blood-red">
                      MATCH RANK #{notification.matchRank}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}