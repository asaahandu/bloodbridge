import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DonorScreenHeader } from '@/components/donor-tabs';
import { HospitalVerificationBadge } from '@/components/HospitalVerificationBadge';
import {
  type CampaignRecord,
  getCampaignImageSource,
  listCampaigns,
  type VoluntaryDonationCentre,
  listVoluntaryDonationCentres,
} from '@/lib/api';
import { getAuthenticatedUser } from '@/lib/auth-session';

type FindSection = 'centres' | 'campaigns';

function CampaignPreviewImage({
  accessibilityLabel,
  source,
  onError,
}: {
  accessibilityLabel: string;
  source?: string;
  onError: (error: string) => void;
}) {
  const [aspectRatio, setAspectRatio] = useState(1.5);

  if (!source) {
    return (
      <View
        className="w-full items-center justify-center bg-[#EFEFED]"
        style={{ aspectRatio }}>
        <ActivityIndicator color="#8E1722" size="small" />
      </View>
    );
  }

  return (
    <View className="w-full bg-[#EFEFED]" style={{ aspectRatio }}>
      <Image
        accessibilityLabel={accessibilityLabel}
        className="h-full w-full"
        resizeMode="cover"
        source={{ uri: source }}
        onLoad={({ nativeEvent }) => {
          const imageSize = nativeEvent?.source;
          if (!imageSize) return;
          const { height, width } = imageSize;
          if (width > 0 && height > 0) {
            setAspectRatio((current) => {
              const next = width / height;
              return Math.abs(current - next) < 0.001 ? current : next;
            });
          }
        }}
        onError={({ nativeEvent }) =>
          onError(nativeEvent?.error ?? 'Unable to load campaign image.')
        }
      />
    </View>
  );
}

export default function DonorFindScreen() {
  const router = useRouter();
  const [section, setSection] = useState<FindSection>('centres');
  const [centres, setCentres] = useState<VoluntaryDonationCentre[]>([]);
  const [loadingCentres, setLoadingCentres] = useState(true);
  const [centresError, setCentresError] = useState('');
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [campaignImageSources, setCampaignImageSources] = useState<Record<string, string>>({});
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignsError, setCampaignsError] = useState('');
  const [failedCampaignImages, setFailedCampaignImages] = useState<Record<string, string>>({});
  const isCentres = section === 'centres';

  const loadCentres = useCallback(async () => {
    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'donor') {
        throw new Error('Please sign in as a donor to view donation centres.');
      }
      setCentres(await listVoluntaryDonationCentres(session.authToken));
    } catch (loadError) {
      setCentresError(
        loadError instanceof Error ? loadError.message : 'Unable to load donation centres.',
      );
    } finally {
      setLoadingCentres(false);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'donor') {
        throw new Error('Please sign in as a donor to view campaigns.');
      }
      const loadedCampaigns = await listCampaigns(session.authToken);
      const campaignsByDate = [...loadedCampaigns].sort((first, second) => {
        const firstDate = Date.parse(first.date);
        const secondDate = Date.parse(second.date);
        if (Number.isNaN(firstDate)) return Number.isNaN(secondDate) ? 0 : 1;
        if (Number.isNaN(secondDate)) return -1;
        return firstDate - secondDate;
      });
      setCampaigns(campaignsByDate);
      const previewImages = await Promise.all(
        campaignsByDate.map(async (campaign) => {
          const coverImage = campaign.images[0];
          if (!coverImage) return null;

          const imageKey = `${campaign.id}:${coverImage.index}`;
          try {
            return [
              imageKey,
              await getCampaignImageSource(
                session.authToken,
                campaign.id,
                coverImage.index,
              ),
            ] as const;
          } catch (imageError) {
            console.warn(
              `BloodBridge could not fetch saved campaign image ${coverImage.name}:`,
              imageError instanceof Error ? imageError.message : 'Unknown error',
            );
            setFailedCampaignImages((current) => ({
              ...current,
              [imageKey]:
                imageError instanceof Error ? imageError.message : 'Unknown image fetch error.',
            }));
            return null;
          }
        }),
      );
      setCampaignImageSources(Object.fromEntries(previewImages.filter((image) => image !== null)));
    } catch (loadError) {
      setCampaignsError(
        loadError instanceof Error ? loadError.message : 'Unable to load campaigns.',
      );
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  const retryLoadingCentres = () => {
    setLoadingCentres(true);
    setCentresError('');
    void loadCentres();
  };

  const retryLoadingCampaigns = () => {
    setLoadingCampaigns(true);
    setCampaignsError('');
    void loadCampaigns();
  };

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      void loadCentres();
      void loadCampaigns();
    }, 0);
    return () => clearTimeout(initialLoad);
  }, [loadCampaigns, loadCentres]);

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-5"
        showsVerticalScrollIndicator={false}>
        <DonorScreenHeader
          subtitle="Explore places to donate and blood donation campaigns."
          title="Find"
        />

        <View className="mt-7 flex-row rounded-2xl bg-[#EFEFED] p-1">
          <Text
            accessibilityRole="button"
            accessibilityState={{ selected: isCentres }}
            accessibilityLabel="Donation Centres"
            className={`flex-1 rounded-xl px-2 py-3 text-center text-[11px] font-bold ${
              isCentres ? 'bg-white text-blood-red shadow-sm' : 'text-muted'
            }`}
            onPress={() => setSection('centres')}>
            Donation Centres
          </Text>
          <Text
            accessibilityRole="button"
            accessibilityState={{ selected: !isCentres }}
            accessibilityLabel="Campaigns"
            className={`flex-1 rounded-xl px-2 py-3 text-center text-[11px] font-bold ${
              !isCentres ? 'bg-white text-blood-red shadow-sm' : 'text-muted'
            }`}
            onPress={() => setSection('campaigns')}>
            Campaigns
          </Text>
        </View>

        {isCentres ? (
          <View className="mt-5">
            {loadingCentres ? (
              <View className="items-center rounded-[21px] border border-line bg-card px-6 py-9">
                <ActivityIndicator color="#8E1722" />
                <Text className="mt-3 text-xs font-semibold text-muted">
                  Loading donation centres...
                </Text>
              </View>
            ) : centresError ? (
              <View className="items-center rounded-[21px] border border-[#F2D1D3] bg-error-soft px-6 py-7">
                <Ionicons color="#8E1722" name="alert-circle-outline" size={25} />
                <Text className="mt-3 text-center text-xs font-bold text-error">
                  Donation centres could not be loaded
                </Text>
                <Text className="mt-1 text-center text-[11px] leading-[17px] text-error">
                  {centresError}
                </Text>
                <Text
                  accessibilityRole="button"
                  className="mt-4 text-[10px] font-extrabold text-error"
                  onPress={retryLoadingCentres}>
                  TRY AGAIN
                </Text>
              </View>
            ) : centres.length === 0 ? (
              <View className="items-center rounded-[21px] border border-line bg-card px-6 py-9">
                <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-[#EFEFED]">
                  <Ionicons color="#737373" name="business-outline" size={24} />
                </View>
                <Text className="mt-3 text-sm font-bold text-ink">No donation centres yet</Text>
                <Text className="mt-1 max-w-[260px] text-center text-[11px] leading-[17px] text-muted">
                  Hospitals offering voluntary donations will appear here.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {centres.map((centre) => (
                  <Pressable
                    accessibilityLabel={`View ${centre.name} donation centre details`}
                    accessibilityRole="button"
                    className="flex-row items-center gap-3 rounded-[21px] border border-line bg-card p-4 active:opacity-75"
                    key={centre.id}
                    onPress={() =>
                      router.push({
                        pathname: '/donors/centre/[centreId]',
                        params: { centreId: centre.id },
                      })
                    }>
                    <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-[#F1F1EF]">
                      <Ionicons color="#8E1722" name="business-outline" size={22} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row flex-wrap items-center gap-1.5">
                        <Text className="text-sm font-bold text-ink">{centre.name}</Text>
                        <HospitalVerificationBadge status={centre.hospitalVerificationStatus} />
                      </View>
                      <Text className="mt-1 text-[11px] text-muted">{centre.cityRegion}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[9px] font-semibold text-muted">DONATION FEE</Text>
                      <Text className="mt-1 text-xs font-extrabold text-blood-red">
                        {centre.feeXaf.toLocaleString()} XAF
                      </Text>
                    </View>
                    <Ionicons color="#8B8B88" name="chevron-forward" size={18} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View className="mt-5">
            {loadingCampaigns ? (
              <View className="items-center rounded-[21px] border border-line bg-card px-6 py-9">
                <ActivityIndicator color="#8E1722" />
                <Text className="mt-3 text-xs font-semibold text-muted">
                  Loading campaigns...
                </Text>
              </View>
            ) : campaignsError ? (
              <View className="items-center rounded-[21px] border border-[#F2D1D3] bg-error-soft px-6 py-7">
                <Ionicons color="#8E1722" name="alert-circle-outline" size={25} />
                <Text className="mt-3 text-center text-xs font-bold text-error">
                  Campaigns could not be loaded
                </Text>
                <Text className="mt-1 text-center text-[11px] leading-[17px] text-error">
                  {campaignsError}
                </Text>
                <Text
                  accessibilityRole="button"
                  className="mt-4 text-[10px] font-extrabold text-error"
                  onPress={retryLoadingCampaigns}>
                  TRY AGAIN
                </Text>
              </View>
            ) : campaigns.length === 0 ? (
              <View className="items-center rounded-[21px] border border-line bg-card px-6 py-9">
                <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-[#EFEFED]">
                  <Ionicons color="#737373" name="calendar-outline" size={24} />
                </View>
                <Text className="mt-3 text-sm font-bold text-ink">No campaigns yet</Text>
                <Text className="mt-1 max-w-[260px] text-center text-[11px] leading-[17px] text-muted">
                  Blood donation campaigns created by hospitals will appear here.
                </Text>
              </View>
            ) : (
              <View className="gap-4">
                {campaigns.map((campaign) => {
                  const coverImage = campaign.images[0];
                  const coverImageKey = `${campaign.id}:${coverImage?.index ?? 0}`;
                  return (
                    <Pressable
                      accessibilityLabel={`Open ${campaign.title}, created by ${campaign.hospitalName}`}
                      accessibilityRole="button"
                      className="overflow-hidden rounded-[21px] border border-line bg-card active:opacity-80"
                      key={campaign.id}
                      onPress={() =>
                        router.push({
                          pathname: '/donors/campaign/[campaignId]',
                          params: { campaignId: campaign.id },
                        })
                      }>
                      {coverImage && !failedCampaignImages[coverImageKey] ? (
                        <CampaignPreviewImage
                          accessibilityLabel={`${campaign.title} campaign image`}
                          source={campaignImageSources[coverImageKey]}
                          onError={(error) => {
                            console.warn(
                              `BloodBridge could not load campaign image ${coverImage.name}:`,
                              error,
                            );
                            setFailedCampaignImages((current) => ({
                              ...current,
                              [coverImageKey]: error,
                            }));
                          }}
                        />
                      ) : (
                        <View className="h-[190px] w-full items-center justify-center bg-[#F1F1EF]">
                          <Ionicons
                            color="#8E1722"
                            name={coverImage ? 'image-outline' : 'heart-outline'}
                            size={38}
                          />
                          <Text className="mt-2 text-[10px] font-bold text-muted">
                            {coverImage ? 'Campaign image unavailable' : 'Blood donation campaign'}
                          </Text>
                          {coverImage && failedCampaignImages[coverImageKey] ? (
                            <Text className="mt-1 px-4 text-center text-[9px] text-muted">
                              {failedCampaignImages[coverImageKey]}
                            </Text>
                          ) : null}
                        </View>
                      )}
                      <View className="p-4">
                        <Text className="text-[16px] font-extrabold text-ink">
                          {campaign.title}
                        </Text>
                        <View className="mt-2 flex-row items-center gap-2">
                          <Ionicons color="#8E1722" name="business-outline" size={15} />
                          <Text className="flex-1 text-[11px] font-semibold text-muted">
                            Organized by {campaign.hospitalName}
                          </Text>
                          <HospitalVerificationBadge
                            status={campaign.hospitalVerificationStatus}
                          />
                          <Ionicons color="#8B8B88" name="chevron-forward" size={18} />
                        </View>
                        <View className="mt-3 flex-row items-center gap-2">
                          <Ionicons color="#737373" name="calendar-outline" size={14} />
                          <Text className="text-[10px] font-semibold text-muted">
                            {new Date(campaign.date).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                          <Ionicons
                            className="ml-2"
                            color="#737373"
                            name="location-outline"
                            size={14}
                          />
                          <Text className="flex-1 text-[10px] font-semibold text-muted" numberOfLines={1}>
                            {campaign.location}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
