import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type CampaignRecord, getCampaign, getCampaignImageSource } from '@/lib/api';
import { HospitalVerificationBadge } from '@/components/HospitalVerificationBadge';
import { getAuthenticatedUser } from '@/lib/auth-session';

export default function CampaignDetailsScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [failedImageIndices, setFailedImageIndices] = useState<Record<number, string>>({});
  const [imageSources, setImageSources] = useState<Record<number, string>>({});

  const loadCampaign = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'donor') {
        throw new Error('Please sign in as a donor to view this campaign.');
      }
      if (!campaignId) throw new Error('The campaign could not be identified.');

      const campaignDetails = await getCampaign(session.authToken, campaignId);
      const imageResults = await Promise.all(
        campaignDetails.images.map(async (image) => {
          try {
            return [
              image.index,
              await getCampaignImageSource(session.authToken, campaignDetails.id, image.index),
            ] as const;
          } catch (imageError) {
            console.warn(
              `BloodBridge could not fetch saved campaign image ${image.name}:`,
              imageError instanceof Error ? imageError.message : 'Unknown error',
            );
            setFailedImageIndices((current) => ({
              ...current,
              [image.index]:
                imageError instanceof Error ? imageError.message : 'Unknown image fetch error.',
            }));
            return null;
          }
        }),
      );
      setImageSources(Object.fromEntries(imageResults.filter((image) => image !== null)));
      setCampaign(campaignDetails);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Unable to load campaign details.',
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useFocusEffect(
    useCallback(() => {
      void loadCampaign();
    }, [loadCampaign]),
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-5"
        showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityLabel="Back to campaigns"
          accessibilityRole="button"
          className="mb-5 h-10 w-10 items-center justify-center rounded-xl bg-white active:opacity-70"
          onPress={() => router.back()}>
          <Ionicons color="#262622" name="arrow-back" size={20} />
        </Pressable>

        {loading ? (
          <View className="items-center rounded-[21px] border border-line bg-card px-6 py-9">
            <ActivityIndicator color="#8E1722" />
            <Text className="mt-3 text-xs font-semibold text-muted">Loading campaign...</Text>
          </View>
        ) : error ? (
          <View className="items-center rounded-[21px] border border-[#F2D1D3] bg-error-soft px-6 py-7">
            <Ionicons color="#8E1722" name="alert-circle-outline" size={25} />
            <Text className="mt-3 text-center text-xs font-bold text-error">
              Campaign details could not be loaded
            </Text>
            <Text className="mt-1 text-center text-[11px] leading-[17px] text-error">{error}</Text>
            <Text
              accessibilityRole="button"
              className="mt-4 text-[10px] font-extrabold text-error"
              onPress={() => void loadCampaign()}>
              TRY AGAIN
            </Text>
          </View>
        ) : campaign ? (
          <>
            <Text className="text-[11px] font-extrabold tracking-[1.4px] text-blood-red">
              BLOOD DONATION CAMPAIGN
            </Text>
            <Text className="mt-1 text-[27px] font-bold tracking-[-0.6px] text-ink">
              {campaign.title}
            </Text>
            <View className="mt-2 flex-row items-center gap-2">
              <Ionicons color="#8E1722" name="business-outline" size={16} />
              <Text className="text-xs font-semibold text-muted">
                Organized by {campaign.hospitalName}
              </Text>
              <HospitalVerificationBadge status={campaign.hospitalVerificationStatus} />
            </View>

            {campaign.images.length > 0 ? (
              <ScrollView
                className="mt-5"
                contentContainerClassName="gap-3"
                horizontal
                showsHorizontalScrollIndicator={false}>
                {campaign.images.map((image) =>
                  failedImageIndices[image.index] ? (
                    <View
                      className="h-[230px] w-[320px] items-center justify-center rounded-[21px] bg-[#F1F1EF]"
                      key={`${campaign.id}-${image.index}`}>
                      <Ionicons color="#8E1722" name="image-outline" size={34} />
                      <Text className="mt-2 text-[10px] font-bold text-muted">
                        Campaign image unavailable
                      </Text>
                      <Text className="mt-1 px-4 text-center text-[9px] text-muted">
                        {failedImageIndices[image.index]}
                      </Text>
                    </View>
                  ) : (
                    <Image
                      accessibilityLabel={`${campaign.title} campaign image`}
                      className="h-[230px] w-[320px] rounded-[21px] bg-[#EFEFED]"
                      key={`${campaign.id}-${image.index}`}
                      resizeMode="cover"
                      onError={({ nativeEvent }) => {
                        console.warn(
                          `BloodBridge could not load campaign image ${image.name}:`,
                          nativeEvent.error,
                        );
                        setFailedImageIndices((current) => ({
                          ...current,
                          [image.index]: nativeEvent.error,
                        }));
                      }}
                      source={{ uri: imageSources[image.index] }}
                    />
                  ),
                )}
              </ScrollView>
            ) : (
              <View className="mt-5 h-[190px] items-center justify-center rounded-[21px] bg-[#F1F1EF]">
                <Ionicons color="#8E1722" name="heart-outline" size={38} />
                <Text className="mt-2 text-[10px] font-bold text-muted">
                  No campaign images provided
                </Text>
              </View>
            )}

            <View className="mt-5 gap-3">
              <View className="flex-row items-center gap-3 rounded-[19px] border border-line bg-card p-4">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-blood-red-soft">
                  <Ionicons color="#8E1722" name="calendar-outline" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-muted">Campaign date</Text>
                  <Text className="mt-1 text-xs font-bold text-ink">
                    {new Date(campaign.date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3 rounded-[19px] border border-line bg-card p-4">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-blood-red-soft">
                  <Ionicons color="#8E1722" name="time-outline" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-muted">Posted on</Text>
                  <Text className="mt-1 text-xs font-bold text-ink">
                    {new Date(campaign.createdAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3 rounded-[19px] border border-line bg-card p-4">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-blood-red-soft">
                  <Ionicons color="#8E1722" name="location-outline" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-muted">Campaign location</Text>
                  <Text className="mt-1 text-xs font-bold text-ink">{campaign.location}</Text>
                </View>
              </View>
            </View>

            <Text className="mb-3 mt-7 text-[17px] font-bold text-ink">About this campaign</Text>
            <View className="rounded-[21px] border border-line bg-card p-4">
              <Text className="text-xs leading-[19px] text-ink">{campaign.description}</Text>
            </View>

            <Text className="mb-3 mt-7 text-[17px] font-bold text-ink">Posted by</Text>
            <View className="gap-3 rounded-[21px] border border-line bg-card p-4">
              <View className="flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-blood-red-soft">
                  <Ionicons color="#8E1722" name="business-outline" size={20} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[10px] font-semibold text-muted">Hospital</Text>
                  <Text className="mt-1 text-sm font-bold text-ink">
                    {campaign.hospital.name}
                  </Text>
                  <View className="mt-1 self-start">
                    <HospitalVerificationBadge
                      status={campaign.hospital.verificationStatus}
                    />
                  </View>
                </View>
              </View>
              {campaign.hospital.cityRegion ? (
                <View className="flex-row items-start gap-3 border-t border-line pt-3">
                  <Ionicons color="#8E1722" name="location-outline" size={17} />
                  <View className="flex-1">
                    <Text className="text-[10px] font-semibold text-muted">Hospital location</Text>
                    <Text className="mt-1 text-xs font-semibold text-ink">
                      {campaign.hospital.cityRegion}
                    </Text>
                  </View>
                </View>
              ) : null}
              {campaign.hospital.phone ? (
                <View className="flex-row items-start gap-3 border-t border-line pt-3">
                  <Ionicons color="#8E1722" name="call-outline" size={17} />
                  <View className="flex-1">
                    <Text className="text-[10px] font-semibold text-muted">Phone</Text>
                    <Text className="mt-1 text-xs font-semibold text-ink">
                      {campaign.hospital.phone}
                    </Text>
                  </View>
                </View>
              ) : null}
              {campaign.hospital.email ? (
                <View className="flex-row items-start gap-3 border-t border-line pt-3">
                  <Ionicons color="#8E1722" name="mail-outline" size={17} />
                  <View className="flex-1">
                    <Text className="text-[10px] font-semibold text-muted">Email</Text>
                    <Text className="mt-1 text-xs font-semibold text-ink">
                      {campaign.hospital.email}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
