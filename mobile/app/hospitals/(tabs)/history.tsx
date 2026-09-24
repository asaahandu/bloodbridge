import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useHospitalRequests } from '@/lib/hospital-data-hooks';

function formatRequestDate(dateValue: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateValue));
}

export default function RequestHistoryScreen() {
  const router = useRouter();
  const { error, loading, refresh, requests } = useHospitalRequests('history');
  const fulfilledCount = requests.filter((request) => request.status === 'fulfilled').length;
  const successRate = requests.length === 0 ? 0 : Math.round((fulfilledCount / requests.length) * 100);

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerClassName="px-5 pb-10 pt-5" showsVerticalScrollIndicator={false}>
        <Text className="text-[11px] font-extrabold tracking-[1.4px] text-blood-red">
          HOSPITAL WORKSPACE
        </Text>
        <Text className="mt-1 text-[27px] font-bold tracking-[-0.6px] text-ink">Request history</Text>
        <Text className="mt-1 text-xs leading-[18px] text-muted">
          Review fulfilled and cancelled blood requests.
        </Text>

        <View className="my-6 flex-row gap-2.5">
          <View className="flex-1 rounded-[19px] bg-ink p-4">
            <Text className="text-[26px] font-extrabold text-white">{requests.length}</Text>
            <Text className="mt-1 text-[10px] font-semibold text-[#AFAFAC]">Total requests</Text>
          </View>
          <View className="flex-1 rounded-[19px] border border-[#D7E9DE] bg-success-soft p-4">
            <Text className="text-[26px] font-extrabold text-success">{fulfilledCount}</Text>
            <Text className="mt-1 text-[10px] font-semibold text-success">Fulfilled</Text>
          </View>
          <View className="flex-1 rounded-[19px] border border-line bg-card p-4">
            <Text className="text-[26px] font-extrabold text-ink">{successRate}%</Text>
            <Text className="mt-1 text-[10px] font-semibold text-muted">Success rate</Text>
          </View>
        </View>

        {loading ? (
          <View className="mb-5 flex-row items-center gap-3 rounded-[15px] border border-line bg-card p-4">
            <ActivityIndicator color="#8E1722" size="small" />
            <Text className="text-xs font-semibold text-muted">Loading request history...</Text>
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

        <Text className="mb-3 text-[17px] font-bold text-ink">Recent requests</Text>
        <View className="overflow-hidden rounded-[21px] border border-line bg-card">
          {!loading && requests.length === 0 ? (
            <View className="items-center px-5 py-9">
              <Ionicons color="#8B8B88" name="time-outline" size={25} />
              <Text className="mt-2 text-xs font-semibold text-muted">No completed requests yet</Text>
            </View>
          ) : null}

          {requests.map((request, index) => {
            const fulfilled = request.status === 'fulfilled';

            return (
              <Pressable
                className={`flex-row items-center gap-3 px-4 py-4 active:bg-[#F7F7F5] ${
                  index < requests.length - 1 ? 'border-b border-line' : ''
                }`}
                key={request._id}
                onPress={() =>
                  router.push({
                    pathname: '/hospitals/requests/[requestId]',
                    params: { requestId: request._id },
                  })
                }>
                <View className="h-12 w-12 items-center justify-center rounded-[14px] bg-blood-red-soft">
                  <Text className="text-[15px] font-extrabold text-blood-red">{request.bloodType}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-ink">
                    {request.internalReference} · {request.ward || request.hospitalName}
                  </Text>
                  <Text className="mt-1 text-[10px] text-muted">{formatRequestDate(request.updatedAt)}</Text>
                </View>
                <View
                  className={`flex-row items-center gap-1 rounded-lg px-2 py-1.5 ${
                    fulfilled ? 'bg-success-soft' : 'bg-[#EFEFED]'
                  }`}>
                  <Ionicons
                    color={fulfilled ? '#1F6A4C' : '#737373'}
                    name={fulfilled ? 'checkmark-circle' : 'close-circle-outline'}
                    size={13}
                  />
                  <Text className={`text-[9px] font-bold ${fulfilled ? 'text-success' : 'text-muted'}`}>
                    {fulfilled ? 'Fulfilled' : 'Cancelled'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
