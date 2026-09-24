import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActiveRequestsSection,
  type HospitalRequest,
} from '@/components/hospital-dashboard';
import { useHospitalRequests } from '@/lib/hospital-data-hooks';
import { toHospitalRequest } from '@/lib/hospital-request-view';

export default function ActiveRequestsScreen() {
  const router = useRouter();
  const { error, loading, refresh, requests: storedRequests } = useHospitalRequests('active');
  const requests = storedRequests.map(toHospitalRequest);

  const openRequest = (request: HospitalRequest) => {
    router.push({
      pathname: '/hospitals/requests/[requestId]',
      params: { requestId: request.id },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-5"
        refreshControl={
          <RefreshControl
            colors={['#8E1722']}
            onRefresh={refresh}
            refreshing={loading}
            tintColor="#8E1722"
          />
        }
        showsVerticalScrollIndicator={false}>
        <View className="mb-6 flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-[11px] font-extrabold tracking-[1.4px] text-blood-red">
              HOSPITAL WORKSPACE
            </Text>
            <Text className="mt-1 text-[27px] font-bold tracking-[-0.6px] text-ink">
              Active requests
            </Text>
            <Text className="mt-1 text-xs leading-[18px] text-muted">
              Monitor every open request and donor response.
            </Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-ink">
            <Ionicons color="#F5A3AA" name="file-tray-full-outline" size={23} />
          </View>
        </View>

        <View className="mb-6 flex-row gap-2.5">
          <View className="flex-1 rounded-[18px] border border-line bg-card p-4">
            <Text className="text-[23px] font-extrabold text-ink">{requests.length}</Text>
            <Text className="mt-1 text-[10px] font-semibold text-muted">Open</Text>
          </View>
          <View className="flex-1 rounded-[18px] border border-[#F0D6D8] bg-blood-red-soft p-4">
            <Text className="text-[23px] font-extrabold text-blood-red">
              {requests.filter((request) => request.attentionReason).length}
            </Text>
            <Text className="mt-1 text-[10px] font-semibold text-blood-red">Need attention</Text>
          </View>
          <View className="flex-1 rounded-[18px] border border-[#D7E9DE] bg-success-soft p-4">
            <Text className="text-[23px] font-extrabold text-success">
              {requests.reduce((total, request) => total + request.confirmed, 0)}
            </Text>
            <Text className="mt-1 text-[10px] font-semibold text-success">Confirmed</Text>
          </View>
        </View>

        {loading ? (
          <View className="mb-5 flex-row items-center gap-3 rounded-[15px] border border-line bg-card p-4">
            <ActivityIndicator color="#8E1722" size="small" />
            <Text className="text-xs font-semibold text-muted">Loading active requests...</Text>
          </View>
        ) : null}

        {error ? (
          <View className="mb-5 rounded-[15px] bg-error-soft p-4">
            <Text className="text-xs font-bold text-error">{error}</Text>
            <Pressable className="mt-2 self-start active:opacity-75" onPress={refresh}>
              <Text className="text-[10px] font-extrabold text-error">TRY AGAIN</Text>
            </Pressable>
          </View>
        ) : null}

        <ActiveRequestsSection requests={requests} onRequestPress={openRequest} />
      </ScrollView>
    </SafeAreaView>
  );
}
