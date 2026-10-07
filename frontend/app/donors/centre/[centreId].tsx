import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DonationCentreMap } from '@/components/donor-home/DonationCentreMap';
import { type AuthenticatedUser, type VoluntaryDonationCentre, getCurrentUser, listVoluntaryDonationCentres } from '@/lib/api';
import { getAuthenticatedUser, saveAuthenticatedUser } from '@/lib/auth-session';

export default function DonationCentreDetailsScreen() {
  const { centreId } = useLocalSearchParams<{ centreId: string }>();
  const router = useRouter();
  const [centre, setCentre] = useState<VoluntaryDonationCentre | null>(null);
  const [donor, setDonor] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'donor') {
        throw new Error('Please sign in as a donor to view this donation centre.');
      }
      if (!centreId) throw new Error('The donation centre could not be identified.');

      const [centres, currentDonor] = await Promise.all([
        listVoluntaryDonationCentres(session.authToken),
        getCurrentUser(session),
      ]);
      const selectedCentre = centres.find(({ id }) => id === centreId);
      if (!selectedCentre) {
        throw new Error('This donation centre is no longer available.');
      }

      await saveAuthenticatedUser(currentDonor);
      setCentre(selectedCentre);
      setDonor(currentDonor);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Unable to load donation centre details.',
      );
    } finally {
      setLoading(false);
    }
  }, [centreId]);

  useFocusEffect(
    useCallback(() => {
      void loadDetails();
    }, [loadDetails]),
  );

  const hospitalCoordinates = centre?.coordinates;
  const donorCoordinates = donor?.location?.coordinates;
  const canShowMap = !!hospitalCoordinates && !!donorCoordinates;

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-5"
        showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityLabel="Back to donation centres"
          accessibilityRole="button"
          className="mb-5 h-10 w-10 items-center justify-center rounded-xl bg-white active:opacity-70"
          onPress={() => router.back()}>
          <Ionicons color="#262622" name="arrow-back" size={20} />
        </Pressable>

        {loading ? (
          <View className="items-center rounded-[21px] border border-line bg-card px-6 py-9">
            <ActivityIndicator color="#8E1722" />
            <Text className="mt-3 text-xs font-semibold text-muted">
              Loading donation centre...
            </Text>
          </View>
        ) : error ? (
          <View className="items-center rounded-[21px] border border-[#F2D1D3] bg-error-soft px-6 py-7">
            <Ionicons color="#8E1722" name="alert-circle-outline" size={25} />
            <Text className="mt-3 text-center text-xs font-bold text-error">
              Donation centre details could not be loaded
            </Text>
            <Text className="mt-1 text-center text-[11px] leading-[17px] text-error">{error}</Text>
            <Text
              accessibilityRole="button"
              className="mt-4 text-[10px] font-extrabold text-error"
              onPress={() => void loadDetails()}>
              TRY AGAIN
            </Text>
          </View>
        ) : centre ? (
          <>
            <Text className="text-[11px] font-extrabold tracking-[1.4px] text-blood-red">
              DONATION CENTRE
            </Text>
            <Text className="mt-1 text-[27px] font-bold tracking-[-0.6px] text-ink">
              {centre.name}
            </Text>
            <View className="mt-5 rounded-[23px] bg-ink p-5">
              <View className="flex-row items-center gap-4">
                <View className="h-14 w-14 items-center justify-center rounded-[17px] bg-blood-red">
                  <Ionicons color="#FFFFFF" name="business" size={27} />
                </View>
                <View className="flex-1">
                  <Text className="text-[17px] font-bold text-white">{centre.name}</Text>
                  <Text className="mt-1 text-[11px] text-[#AFAFAC]">{centre.cityRegion}</Text>
                </View>
              </View>
            </View>

            <View className="mt-4 flex-row items-center gap-3 rounded-[19px] border border-line bg-card p-4">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-blood-red-soft">
                <Ionicons color="#8E1722" name="cash-outline" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-semibold text-muted">Voluntary donation fee</Text>
                <Text className="mt-1 text-[17px] font-extrabold text-blood-red">
                  {centre.feeXaf.toLocaleString()} XAF
                </Text>
              </View>
            </View>

            <Text className="mb-3 mt-7 text-[17px] font-bold text-ink">Contact information</Text>
            <View className="rounded-[21px] border border-line bg-card px-4">
              <View className="flex-row items-center gap-3 border-b border-line py-4">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F1F1EF]">
                  <Ionicons color="#5F5F5C" name="call-outline" size={17} />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-muted">Phone</Text>
                  <Text className="mt-1 text-xs font-bold text-ink">{centre.phone}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3 py-4">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F1F1EF]">
                  <Ionicons color="#5F5F5C" name="mail-outline" size={17} />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-muted">Email</Text>
                  <Text className="mt-1 text-xs font-bold text-ink">{centre.email}</Text>
                </View>
              </View>
            </View>

            <Text className="mb-3 mt-7 text-[17px] font-bold text-ink">Location</Text>
            {canShowMap ? (
              <>
                <DonationCentreMap
                  donorCoordinates={donorCoordinates}
                  donorName="Your location"
                  hospitalCoordinates={hospitalCoordinates}
                  hospitalName={centre.name}
                />
                <View className="mt-3 flex-row gap-3">
                  <View className="flex-1 flex-row items-center gap-2">
                    <View className="h-3 w-3 rounded-full bg-ink" />
                    <Text className="flex-1 text-[10px] font-semibold text-muted">Your location</Text>
                  </View>
                  <View className="flex-1 flex-row items-center gap-2">
                    <View className="h-3 w-3 rounded-full bg-blood-red" />
                    <Text className="flex-1 text-[10px] font-semibold text-muted">Donation centre</Text>
                  </View>
                </View>
              </>
            ) : (
              <View className="rounded-[19px] border border-line bg-card p-4">
                <Text className="text-xs font-bold text-ink">
                  {!hospitalCoordinates
                    ? 'This hospital has not saved a GPS location yet.'
                    : 'Your GPS location is not available.'}
                </Text>
                <Text className="mt-1 text-[10px] leading-[15px] text-muted">
                  A map with both locations will appear once the missing location is available.
                </Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
