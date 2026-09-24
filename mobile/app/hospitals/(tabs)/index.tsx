import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActiveRequestsSection,
  AttentionNeededSection,
  type HospitalRequest,
} from '@/components/hospital-dashboard';
import { useHospitalRequests } from '@/lib/hospital-data-hooks';
import { formatElapsed, toHospitalRequest } from '@/lib/hospital-request-view';

export default function HospitalDashboardScreen() {
  const router = useRouter();
  const { error, loading, refresh, requests: storedRequests, user } = useHospitalRequests('all');
  const activeStoredRequests = storedRequests.filter((request) => request.status === 'active');
  const requests = activeStoredRequests.map(toHospitalRequest);
  const attentionRequests = requests.filter((request) => request.attentionReason);
  const notifiedDonorCount = requests.reduce((total, request) => total + request.notified, 0);
  const confirmedDonorCount = requests.reduce((total, request) => total + request.confirmed, 0);

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
        contentContainerClassName={`px-5 pb-10 ${Platform.OS === 'android' ? 'pt-6' : 'pt-3'}`}
        showsVerticalScrollIndicator={false}>
        <View className="mb-6 flex-row items-center justify-between">
          <View className="min-w-0 flex-1 pr-3">
            <View className="mb-2 flex-row items-center gap-2">
              <View className="h-[28px] w-[28px] items-center justify-center rounded-lg bg-blood-red">
                <Ionicons color="#FFFFFF" name="water" size={17} />
              </View>
              <Text className="text-base font-extrabold tracking-[1.7px] text-blood-red">
                BLOODBRIDGE
              </Text>
              <Text className="text-[11px] font-semibold text-muted">|</Text>
              <Text
                className="shrink text-[9px] font-bold tracking-[0.6px] text-muted"
                numberOfLines={1}>
                HOSPITAL DASHBOARD
              </Text>
            </View>
            <Text className="text-[25px] font-bold tracking-[-0.6px] text-ink">Good morning</Text>
            <Text className="mt-1 text-xs text-muted">
              {user?.fullName ?? 'Hospital account'} · Live operations
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Open notifications"
            className="h-12 w-12 items-center justify-center rounded-2xl border border-line bg-card active:opacity-75">
            <Ionicons color="#121212" name="notifications-outline" size={23} />
            <View className="absolute right-[11px] top-2.5 h-[9px] w-[9px] rounded-full border-2 border-card bg-blood-red" />
          </Pressable>
        </View>

        {loading ? (
          <View className="mb-5 flex-row items-center gap-3 rounded-[15px] border border-line bg-card p-4">
            <ActivityIndicator color="#8E1722" size="small" />
            <Text className="text-xs font-semibold text-muted">Refreshing hospital data...</Text>
          </View>
        ) : null}

        {error ? (
          <View className="mb-5 flex-row items-start gap-3 rounded-[15px] bg-error-soft p-4">
            <Ionicons color="#B42318" name="cloud-offline-outline" size={20} />
            <View className="flex-1">
              <Text className="text-xs font-bold text-error">{error}</Text>
              <Pressable className="mt-2 self-start active:opacity-75" onPress={refresh}>
                <Text className="text-[10px] font-extrabold text-error">TRY AGAIN</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View className="mb-6 flex-row gap-2.5">
          <View className="flex-1 rounded-[19px] bg-ink p-4">
            <View className="mb-4 h-8 w-8 items-center justify-center rounded-[10px] bg-[#2B2B2B]">
              <Ionicons color="#F5A3AA" name="file-tray-full-outline" size={18} />
            </View>
            <Text className="text-[27px] font-extrabold text-white">{requests.length}</Text>
            <Text className="mt-1 text-[10px] font-semibold leading-[14px] text-[#AFAFAC]">
              Open requests
            </Text>
          </View>
          <View className="flex-1 rounded-[19px] border border-line bg-card p-4">
            <View className="mb-4 h-8 w-8 items-center justify-center rounded-[10px] bg-blood-red-soft">
              <Ionicons color="#8E1722" name="notifications-outline" size={18} />
            </View>
            <Text className="text-[27px] font-extrabold text-ink">{notifiedDonorCount}</Text>
            <Text className="mt-1 text-[10px] font-semibold leading-[14px] text-muted">
              Donors notified
            </Text>
          </View>
          <View className="flex-1 rounded-[19px] border border-[#D7E9DE] bg-success-soft p-4">
            <View className="mb-4 h-8 w-8 items-center justify-center rounded-[10px] bg-white">
              <Ionicons color="#1F6A4C" name="checkmark-circle-outline" size={18} />
            </View>
            <Text className="text-[27px] font-extrabold text-success">{confirmedDonorCount}</Text>
            <Text className="mt-1 text-[10px] font-semibold leading-[14px] text-success">
              Confirmed donors
            </Text>
          </View>
        </View>

        <AttentionNeededSection requests={attentionRequests} onRequestPress={openRequest} />

        <View className="mt-7">
          <ActiveRequestsSection requests={requests.slice(0, 5)} onRequestPress={openRequest} />
        </View>

        <View className="mt-7">
          <Text className="text-[19px] font-bold tracking-[-0.35px] text-ink">Recent activity</Text>
          <Text className="mb-3 mt-1 text-xs text-muted">Latest matching and request updates</Text>
          <View className="rounded-[21px] border border-line bg-card px-4">
            {storedRequests.length === 0 ? (
              <View className="items-center py-7">
                <Ionicons color="#8B8B88" name="pulse-outline" size={23} />
                <Text className="mt-2 text-xs font-semibold text-muted">No request activity yet</Text>
              </View>
            ) : storedRequests.slice(0, 4).map((request, index) => (
              <View
                className={`flex-row items-center gap-3 py-3.5 ${
                  index < Math.min(storedRequests.length, 4) - 1 ? 'border-b border-line' : ''
                }`}
                key={request._id}>
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F1F1EF]">
                  <Ionicons
                    color="#5F5F5C"
                    name={request.status === 'fulfilled' ? 'checkmark-circle-outline' : 'water-outline'}
                    size={17}
                  />
                </View>
                <Text className="flex-1 text-xs font-semibold leading-[17px] text-ink">
                  {request.internalReference}{' '}
                  {request.status === 'active'
                    ? 'was submitted'
                    : `was marked ${request.status}`}
                </Text>
                <Text className="text-[9px] font-medium text-muted">
                  {formatElapsed(request.updatedAt)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
