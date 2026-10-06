import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DonorSearchModal } from '@/components/hospital-dashboard';
import { getDonorScanDurationMs } from '@/components/hospital-dashboard/donor-search-config';
import {
    type AuthenticatedUser,
    createBloodRequest,
    createHospitalCampaign,
    type DonorMatchScan,
    draftBloodRequest,
    getHospitalRequestDonorMatches,
} from '@/lib/api';
import { getAuthenticatedUser } from '@/lib/auth-session';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const urgencyLevels = ['Routine', 'Urgent', 'Critical'] as const;
const apiUrgency = {
  Routine: 'standard',
  Urgent: 'urgent',
  Critical: 'critical',
} as const;
const urgencyRadiusKm = { Routine: 10, Urgent: 20, Critical: 40 } as const;
const draftUrgency = {
  standard: 'Routine',
  urgent: 'Urgent',
  critical: 'Critical',
} as const;

const draftFieldLabels = {
  bloodType: 'blood type',
  unitsNeeded: 'units required',
  urgency: 'urgency',
  internalReference: 'internal reference',
} as const;
const maximumCampaignImages = 5;
const maximumCampaignImageSize = 5 * 1024 * 1024;
const maximumCampaignImagesSize = 10 * 1024 * 1024;

type SubmittedRequest = {
  bloodType: string;
  id: string;
  radiusKm: number;
  reference: string;
};

function isValidCampaignDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(`${value}T00:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

export default function NewRequestScreen() {
  const [requestTab, setRequestTab] = useState<'blood' | 'campaign'>('blood');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDate, setCampaignDate] = useState('');
  const [campaignLocation, setCampaignLocation] = useState('');
  const [campaignImages, setCampaignImages] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignError, setCampaignError] = useState('');
  const [campaignSuccess, setCampaignSuccess] = useState('');
  const [campaignImagesLoading, setCampaignImagesLoading] = useState(false);
  const [campaignSubmitting, setCampaignSubmitting] = useState(false);
  const [bloodType, setBloodType] = useState('O+');
  const [urgency, setUrgency] = useState<(typeof urgencyLevels)[number]>('Urgent');
  const [reference, setReference] = useState('');
  const [ward, setWard] = useState('');
  const [units, setUnits] = useState(1);
  const [proposedAmount, setProposedAmount] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiDraftError, setAiDraftError] = useState('');
  const [aiDraftNotice, setAiDraftNotice] = useState('');
  const [facility, setFacility] = useState<AuthenticatedUser | null>(null);
  const [facilityLoaded, setFacilityLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedRequest>();
  const [matchScan, setMatchScan] = useState<DonorMatchScan>();
  const [matchScanLoading, setMatchScanLoading] = useState(false);
  const [matchScanError, setMatchScanError] = useState('');
  const matchScanRequestId = useRef(0);

  const longitude = facility?.location?.coordinates[0];
  const latitude = facility?.location?.coordinates[1];

  useEffect(() => {
    let active = true;

    getAuthenticatedUser()
      .then((user) => {
        if (active) {
          const hospital = user?.role === 'hospital' ? user : null;
          setFacility(hospital);
          if (hospital) setCampaignLocation((current) => current || hospital.cityRegion);
        }
      })
      .finally(() => {
        if (active) setFacilityLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const chooseCampaignImages = async () => {
    if (campaignImagesLoading || campaignImages.length >= maximumCampaignImages) return;

    setCampaignImagesLoading(true);
    setCampaignError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
        type: ['image/jpeg', 'image/png'],
      });
      if (result.canceled) return;

      const nextImages = [...campaignImages, ...result.assets];
      if (nextImages.length > maximumCampaignImages) {
        setCampaignError('Choose no more than five images.');
        return;
      }
      if (nextImages.some((image) => (image.size ?? 0) > maximumCampaignImageSize)) {
        setCampaignError('Each image must be 5 MB or smaller.');
        return;
      }
      if (nextImages.reduce((total, image) => total + (image.size ?? 0), 0) > maximumCampaignImagesSize) {
        setCampaignError('Images must total 10 MB or less.');
        return;
      }

      setCampaignImages(nextImages);
    } catch {
      setCampaignError('Unable to open the image picker. Please try again.');
    } finally {
      setCampaignImagesLoading(false);
    }
  };

  const createCampaign = async () => {
    if (campaignSubmitting) return;

    setCampaignError('');
    setCampaignSuccess('');
    if (!campaignTitle.trim()) {
      setCampaignError('Enter a campaign title.');
      return;
    }
    if (!isValidCampaignDate(campaignDate)) {
      setCampaignError('Enter a valid campaign date in YYYY-MM-DD format.');
      return;
    }
    if (!campaignLocation.trim()) {
      setCampaignError('Enter the campaign location.');
      return;
    }
    if (!campaignDescription.trim()) {
      setCampaignError('Add a description for the campaign.');
      return;
    }
    if (!facility) {
      setCampaignError('Sign in again as a hospital before creating a campaign.');
      return;
    }

    setCampaignSubmitting(true);
    try {
      await createHospitalCampaign(facility.authToken, {
        title: campaignTitle.trim(),
        date: campaignDate,
        location: campaignLocation.trim(),
        description: campaignDescription.trim(),
        images: campaignImages,
      });
      setCampaignTitle('');
      setCampaignDate('');
      setCampaignLocation(facility.cityRegion);
      setCampaignImages([]);
      setCampaignDescription('');
      setCampaignSuccess('Campaign created and saved successfully.');
    } catch (error) {
      setCampaignError(
        error instanceof Error ? error.message : 'Unable to save the campaign. Please try again.',
      );
    } finally {
      setCampaignSubmitting(false);
    }
  };

  const scanForDonors = async (requestId: string, authToken: string, radiusKm: number) => {
    const scanRequestId = ++matchScanRequestId.current;
    setMatchScan(undefined);
    setMatchScanError('');
    setMatchScanLoading(true);
    const minimumScan = new Promise((resolve) =>
      setTimeout(resolve, getDonorScanDurationMs(radiusKm)),
    );

    try {
      const result = await getHospitalRequestDonorMatches(authToken, requestId);
      if (matchScanRequestId.current === scanRequestId) setMatchScan(result);
      await minimumScan;
    } catch (error) {
      if (matchScanRequestId.current !== scanRequestId) return;
      setMatchScanError(
        error instanceof Error ? error.message : 'Unable to search for matching donors.',
      );
    } finally {
      if (matchScanRequestId.current === scanRequestId) setMatchScanLoading(false);
    }
  };

  const closeDonorSearch = () => {
    matchScanRequestId.current += 1;
    setSubmittedRequest(undefined);
    setMatchScan(undefined);
    setMatchScanError('');
    setMatchScanLoading(false);
  };

  const generateAiDraft = async () => {
    if (aiDrafting) return;

    if (aiDescription.trim().length < 12) {
      Alert.alert('Add more detail', 'Describe the request in at least 12 characters.');
      return;
    }

    if (!facility) {
      Alert.alert('Facility unavailable', 'Sign in again before drafting a request.');
      return;
    }

    setAiDrafting(true);
    setAiDraftError('');
    setAiDraftNotice('');

    try {
      const draft = await draftBloodRequest(facility.authToken, aiDescription.trim());

      if (draft.bloodType) setBloodType(draft.bloodType);
      if (draft.unitsNeeded) setUnits(draft.unitsNeeded);
      if (draft.urgency) setUrgency(draftUrgency[draft.urgency]);
      if (draft.internalReference) setReference(draft.internalReference);
      if (draft.ward) setWard(draft.ward);
      if (draft.rewardAmount != null) setProposedAmount(String(draft.rewardAmount));

      const missingFields = draft.missingFields.map((field) => draftFieldLabels[field]);
      const noticeParts = ['AI draft applied. Review every field before submitting.'];
      if (missingFields.length > 0) {
        noticeParts.push(`Needs staff confirmation: ${missingFields.join(', ')}.`);
      }
      if (draft.warnings.length > 0) noticeParts.push(draft.warnings.join(' '));
      setAiDraftNotice(noticeParts.join(' '));
    } catch (error) {
      setAiDraftError(
        error instanceof Error ? error.message : 'Unable to draft this request with AI.',
      );
    } finally {
      setAiDrafting(false);
    }
  };

  const submitRequest = async () => {
    if (submitting) return;

    if (!reference.trim()) {
      Alert.alert('Reference required', 'Add a ward, case label, or internal reference.');
      return;
    }

    if (!facility) {
      Alert.alert('Facility unavailable', 'Sign in again to confirm the hospital for this request.');
      return;
    }

    setSubmitting(true);
    setSubmissionError('');

    try {
      const neededWithinHours = { Routine: 24, Urgent: 6, Critical: 2 }[urgency];
      const request = await createBloodRequest(facility.authToken, {
        bloodType,
        unitsNeeded: units,
        urgency: apiUrgency[urgency],
        internalReference: reference.trim(),
        ...(ward.trim() ? { ward: ward.trim() } : {}),
        ...(Number(proposedAmount) > 0 ? { rewardAmount: Number(proposedAmount) } : {}),
        neededBy: new Date(Date.now() + neededWithinHours * 60 * 60 * 1000).toISOString(),
      });

      setSubmittedRequest({
        bloodType,
        id: request._id,
        radiusKm: urgencyRadiusKm[urgency],
        reference: request.internalReference,
      });
      void scanForDonors(request._id, facility.authToken, urgencyRadiusKm[urgency]);
      setReference('');
      setWard('');
      setUnits(1);
      setProposedAmount('');
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Unable to submit the request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerClassName="px-5 pb-10 pt-5" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <Text className="text-[11px] font-extrabold tracking-[1.4px] text-blood-red">
            HOSPITAL WORKSPACE
          </Text>
          <Text className="mt-1 text-[27px] font-bold tracking-[-0.6px] text-ink">New request</Text>
          <Text className="mt-1 text-xs leading-[18px] text-muted">
            Prepare an alert for compatible donors near your hospital.
          </Text>
        </View>

        <View className="mb-5 flex-row rounded-[14px] border border-line bg-[#F1F1EF] p-1">
          {[
            { label: 'New Blood Request', value: 'blood' as const },
            { label: 'New Campaign', value: 'campaign' as const },
          ].map((tab) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: requestTab === tab.value }}
              key={tab.value}
              onPress={() => setRequestTab(tab.value)}
              style={{
                alignItems: 'center',
                backgroundColor: requestTab === tab.value ? '#FFFFFF' : 'transparent',
                borderRadius: 10,
                flex: 1,
                justifyContent: 'center',
                minHeight: 44,
                paddingHorizontal: 8,
              }}>
              <Text
                className={`text-center text-[11px] font-bold ${
                  requestTab === tab.value ? 'text-blood-red' : 'text-muted'
                }`}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {requestTab === 'campaign' ? (
          <View className="gap-5 rounded-[21px] border border-line bg-card p-5">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-blood-red-soft">
                <Ionicons color="#8E1722" name="megaphone-outline" size={21} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-ink">Campaign details</Text>
                <Text className="mt-1 text-[10px] text-muted">Share a community blood drive</Text>
              </View>
            </View>

            <View>
              <Text className="mb-2 text-xs font-bold text-ink">Campaign title</Text>
              <TextInput
                accessibilityLabel="Campaign title"
                autoCapitalize="sentences"
                className="h-12 rounded-[13px] border border-line bg-[#FAFAF9] px-3.5 text-sm text-ink"
                maxLength={100}
                onChangeText={setCampaignTitle}
                placeholder="Example: Community blood donation day"
                placeholderTextColor="#8B8B88"
                value={campaignTitle}
              />
            </View>

            <View>
              <Text className="mb-2 text-xs font-bold text-ink">Date</Text>
              <View className="h-12 flex-row items-center gap-3 rounded-[13px] border border-line bg-[#FAFAF9] px-3.5">
                <Ionicons color="#737373" name="calendar-outline" size={18} />
                <TextInput
                  accessibilityLabel="Campaign date"
                  className="flex-1 py-0 text-sm text-ink"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  onChangeText={setCampaignDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#8B8B88"
                  value={campaignDate}
                />
              </View>
            </View>

            <View>
              <Text className="mb-2 text-xs font-bold text-ink">Location</Text>
              <View className="h-12 flex-row items-center gap-3 rounded-[13px] border border-line bg-[#FAFAF9] px-3.5">
                <Ionicons color="#737373" name="location-outline" size={18} />
                <TextInput
                  accessibilityLabel="Campaign location"
                  autoCapitalize="words"
                  className="flex-1 py-0 text-sm text-ink"
                  maxLength={160}
                  onChangeText={setCampaignLocation}
                  placeholder="Venue, city or region"
                  placeholderTextColor="#8B8B88"
                  value={campaignLocation}
                />
              </View>
            </View>

            <View>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-bold text-ink">Images</Text>
                <Text className="text-[10px] text-muted">Optional · up to 5</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {campaignImages.map((image, index) => (
                  <View className="relative" key={`${image.uri}-${index}`}>
                    <Image
                      accessibilityLabel={image.name}
                      className="h-[76px] w-[76px] rounded-[10px] bg-[#F1F1EF]"
                      source={{ uri: image.uri }}
                    />
                    <Pressable
                      accessibilityLabel={`Remove ${image.name}`}
                      accessibilityRole="button"
                      className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-ink"
                      onPress={() => setCampaignImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}>
                      <Ionicons color="#FFFFFF" name="close" size={13} />
                    </Pressable>
                  </View>
                ))}
                {campaignImages.length < maximumCampaignImages ? (
                  <Pressable
                    accessibilityRole="button"
                    className="h-[76px] w-[76px] items-center justify-center rounded-[10px] border border-dashed border-[#D8B7BA] bg-blood-red-soft active:opacity-75"
                    disabled={campaignImagesLoading}
                    onPress={() => void chooseCampaignImages()}>
                    {campaignImagesLoading ? (
                      <ActivityIndicator color="#8E1722" size="small" />
                    ) : (
                      <>
                        <Ionicons color="#8E1722" name="image-outline" size={21} />
                        <Text className="mt-1 text-[9px] font-bold text-blood-red">Add image</Text>
                      </>
                    )}
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View>
              <Text className="mb-2 text-xs font-bold text-ink">Description</Text>
              <TextInput
                accessibilityLabel="Campaign description"
                className="min-h-[112px] rounded-[13px] border border-line bg-[#FAFAF9] px-3.5 py-3 text-sm leading-5 text-ink"
                maxLength={1000}
                multiline
                onChangeText={setCampaignDescription}
                placeholder="Tell donors what the campaign is for and how they can take part."
                placeholderTextColor="#8B8B88"
                textAlignVertical="top"
                value={campaignDescription}
              />
              <Text className="mt-1 text-right text-[10px] text-muted">
                {campaignDescription.length}/1000
              </Text>
            </View>

            {campaignError ? (
              <View className="flex-row items-start gap-2 rounded-[12px] bg-error-soft p-3">
                <Ionicons color="#B42318" name="alert-circle-outline" size={17} />
                <Text className="flex-1 text-[11px] font-semibold leading-[16px] text-error">
                  {campaignError}
                </Text>
              </View>
            ) : null}
            {campaignSuccess ? (
              <View className="flex-row items-start gap-2 rounded-[12px] bg-success-soft p-3">
                <Ionicons color="#1F6A4C" name="checkmark-circle-outline" size={17} />
                <Text className="flex-1 text-[11px] font-semibold leading-[16px] text-success">
                  {campaignSuccess}
                </Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              className="h-12 flex-row items-center justify-center gap-2 rounded-[13px] bg-ink active:opacity-75"
              onPress={createCampaign}>
              <Text className="text-xs font-extrabold text-white">Create campaign</Text>
              <Ionicons color="#FFFFFF" name="arrow-forward" size={17} />
            </Pressable>
          </View>
        ) : (
          <>
        <View className="mb-5 overflow-hidden rounded-[23px] bg-ink">
          <View className="flex-row items-start gap-3 p-5">
            <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-[#2B2B2B]">
              <Ionicons color="#F5A3AA" name="sparkles-outline" size={21} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-extrabold text-white">Draft with AI</Text>
              <Text className="mt-1 text-[10px] leading-[16px] text-[#BDBDB8]">
                Describe the operational request in plain language. Do not include patient names,
                phone numbers, or medical record numbers. Details the AI cannot find stay unchanged.
              </Text>
            </View>
          </View>

          <View className="mx-5 rounded-[15px] border border-[#353535] bg-[#1D1D1D] px-4 py-3">
            <TextInput
              accessibilityLabel="Plain-language blood request for AI drafting"
              className="min-h-20 text-sm leading-5 text-white"
              maxLength={800}
              multiline
              onChangeText={(value) => {
                setAiDescription(value);
                setAiDraftError('');
                setAiDraftNotice('');
              }}
              placeholder="Example: Critical request for 3 units O- in ICU, case BB-2482"
              placeholderTextColor="#777773"
              textAlignVertical="top"
              value={aiDescription}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: aiDrafting }}
            className={`m-5 h-12 flex-row items-center justify-center gap-2 rounded-[13px] bg-blood-red active:opacity-75 ${
              aiDrafting ? 'opacity-60' : ''
            }`}
            disabled={aiDrafting}
            onPress={generateAiDraft}>
            {aiDrafting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons color="#FFFFFF" name="sparkles" size={17} />
            )}
            <Text className="text-xs font-extrabold text-white">
              {aiDrafting ? 'Preparing draft...' : 'Fill form from description'}
            </Text>
          </Pressable>
        </View>

        {aiDraftNotice ? (
          <View className="mb-5 flex-row items-start gap-3 rounded-[17px] bg-success-soft p-4">
            <Ionicons color="#1F6A4C" name="checkmark-circle-outline" size={20} />
            <Text className="flex-1 text-xs font-semibold leading-[18px] text-success">
              {aiDraftNotice}
            </Text>
          </View>
        ) : null}

        {aiDraftError ? (
          <View className="mb-5 flex-row items-start gap-3 rounded-[17px] bg-error-soft p-4">
            <Ionicons color="#B42318" name="alert-circle-outline" size={20} />
            <Text className="flex-1 text-xs font-semibold leading-[18px] text-error">
              {aiDraftError}
            </Text>
          </View>
        ) : null}

        <Text className="mb-3 text-[13px] font-bold text-ink">Location / facility</Text>
        <View className="mb-5 rounded-[21px] border border-line bg-card p-4">
          <View className="flex-row items-start gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-blood-red-soft">
              <Ionicons color="#8E1722" name="business-outline" size={21} />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-sm font-bold text-ink" numberOfLines={1}>
                  {!facilityLoaded
                    ? 'Loading signed-in facility...'
                    : facility?.fullName ?? 'Facility details unavailable'}
                </Text>
                {facility ? (
                  <View className="rounded-lg bg-success-soft px-2 py-1">
                    <Text className="text-[8px] font-extrabold tracking-[0.6px] text-success">
                      AUTO-FILLED
                    </Text>
                  </View>
                ) : null}
              </View>
              <View className="mt-2 flex-row items-center gap-1.5">
                <Ionicons color="#737373" name="location-outline" size={14} />
                <Text className="flex-1 text-[11px] text-muted">
                  {facility?.cityRegion ?? 'Sign in again to load the hospital location'}
                </Text>
              </View>
              {facility?.location ? (
                <View className="mt-2 flex-row items-center gap-1.5">
                  <Ionicons color="#1F6A4C" name="navigate-circle-outline" size={14} />
                  <Text className="text-[10px] font-semibold text-success">
                    Saved GPS confirmed · {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text className="mt-3 border-t border-line pt-3 text-[10px] leading-[15px] text-muted">
            This comes from the signed-in hospital profile and will be attached to the request.
          </Text>
        </View>

        <View className="rounded-[23px] border border-line bg-card p-5">
          <Text className="text-[13px] font-bold text-ink">Blood type needed</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {bloodTypes.map((type) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: bloodType === type }}
                className={`h-11 w-[22%] items-center justify-center rounded-xl border active:opacity-75 ${
                  bloodType === type
                    ? 'border-blood-red bg-blood-red'
                    : 'border-line bg-[#FAFAF9]'
                }`}
                key={type}
                onPress={() => setBloodType(type)}>
                <Text
                  className={`text-sm font-extrabold ${bloodType === type ? 'text-white' : 'text-ink'}`}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="mt-6 text-[13px] font-bold text-ink">Urgency</Text>
          <View className="mt-3 flex-row gap-2">
            {urgencyLevels.map((level) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: urgency === level }}
                className={`flex-1 items-center rounded-xl border py-3 active:opacity-75 ${
                  urgency === level
                    ? level === 'Critical'
                      ? 'border-blood-red bg-blood-red-soft'
                      : 'border-ink bg-ink'
                    : 'border-line bg-[#FAFAF9]'
                }`}
                key={level}
                onPress={() => setUrgency(level)}>
                <Text
                  className={`text-[11px] font-bold ${
                    urgency === level
                      ? level === 'Critical'
                        ? 'text-blood-red'
                        : 'text-white'
                      : 'text-muted'
                  }`}>
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="mt-6 text-[13px] font-bold text-ink">Internal reference</Text>
          <View className="mt-3 flex-row items-center rounded-[14px] border border-line bg-[#FAFAF9] px-4">
            <Ionicons color="#737373" name="document-text-outline" size={19} />
            <TextInput
              className="h-13 flex-1 px-3 text-sm text-ink"
              onChangeText={setReference}
              placeholder="Example: Case 2482"
              placeholderTextColor="#9B9B97"
              value={reference}
            />
          </View>

          <View className="mt-5 flex-row items-center gap-2">
            <Text className="text-[13px] font-bold text-ink">Ward / department</Text>
            <Text className="rounded-md bg-[#EFEFED] px-1.5 py-1 text-[8px] font-bold text-muted">
              OPTIONAL
            </Text>
          </View>
          <View className="mt-3 flex-row items-center rounded-[14px] border border-line bg-[#FAFAF9] px-4">
            <Ionicons color="#737373" name="git-branch-outline" size={19} />
            <TextInput
              className="h-13 flex-1 px-3 text-sm text-ink"
              onChangeText={setWard}
              placeholder="Example: East wing · ICU"
              placeholderTextColor="#9B9B97"
              value={ward}
            />
          </View>

          <View className="mt-6 flex-row items-center justify-between">
            <View>
              <Text className="text-[13px] font-bold text-ink">Units required</Text>
              <Text className="mt-1 text-[10px] text-muted">Whole blood or equivalent units</Text>
            </View>
            <View className="flex-row items-center rounded-[14px] border border-line bg-[#FAFAF9] p-1">
              <Pressable
                accessibilityLabel="Decrease units"
                className="h-9 w-9 items-center justify-center rounded-[10px] bg-white active:opacity-75"
                onPress={() => setUnits((current) => Math.max(1, current - 1))}>
                <Ionicons color="#121212" name="remove" size={18} />
              </Pressable>
              <Text className="w-10 text-center text-sm font-extrabold text-ink">{units}</Text>
              <Pressable
                accessibilityLabel="Increase units"
                className="h-9 w-9 items-center justify-center rounded-[10px] bg-ink active:opacity-75"
                onPress={() => setUnits((current) => Math.min(20, current + 1))}>
                <Ionicons color="#FFFFFF" name="add" size={18} />
              </Pressable>
            </View>
          </View>

          <View className="mt-6 border-t border-line pt-6">
            <View className="flex-row items-center gap-2">
              <Text className="text-[13px] font-bold text-ink">Amount proposed</Text>
              <Text className="rounded-md bg-[#EFEFED] px-1.5 py-1 text-[8px] font-bold text-muted">
                OPTIONAL
              </Text>
            </View>
            <Text className="mt-1.5 text-[10px] leading-[15px] text-muted">
              Add a voluntary reward the hospital proposes for the donor, or leave this blank.
            </Text>
            <View className="mt-3 flex-row items-center overflow-hidden rounded-[14px] border border-line bg-[#FAFAF9]">
              <View className="h-13 items-center justify-center border-r border-line bg-[#F1F1EF] px-4">
                <Text className="text-xs font-extrabold text-ink">FCFA</Text>
              </View>
              <TextInput
                accessibilityLabel="Optional proposed reward amount in FCFA"
                className="h-13 flex-1 px-4 text-sm font-bold text-ink"
                keyboardType="number-pad"
                onChangeText={(value) => setProposedAmount(value.replace(/\D/g, '').slice(0, 9))}
                placeholder="0"
                placeholderTextColor="#9B9B97"
                value={proposedAmount}
              />
            </View>
          </View>
        </View>

        <View className="mt-4 flex-row items-start gap-3 rounded-[19px] bg-ink p-5">
          <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-[#2B2B2B]">
            <Ionicons color="#F5A3AA" name="scan-outline" size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-white">Donor search starts after submission</Text>
            <Text className="mt-1 text-[10px] leading-[16px] text-[#AFAFAC]">
              Anonymous compatible donor positions appear as the expanding radius reaches them.
              Final rankings and totals appear when the scan finishes.
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-start gap-3 rounded-[17px] bg-blood-red-soft p-4">
          <Ionicons color="#8E1722" name="notifications-outline" size={20} />
          <Text className="flex-1 text-xs leading-[18px] text-[#7B3138]">
            Publishing will send a loud alert to compatible, available donors in range.
          </Text>
        </View>

        {submissionError ? (
          <View className="mt-4 flex-row items-start gap-3 rounded-[17px] bg-error-soft p-4">
            <Ionicons color="#B42318" name="alert-circle-outline" size={20} />
            <Text className="flex-1 text-xs font-semibold leading-[18px] text-error">
              {submissionError}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
          className={`mt-5 h-14 flex-row items-center justify-center gap-2 rounded-[15px] bg-ink active:opacity-75 ${
            submitting ? 'opacity-60' : ''
          }`}
          disabled={submitting}
          onPress={submitRequest}>
          {submitting ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text className="text-sm font-extrabold text-white">Submitting...</Text>
            </>
          ) : (
            <>
              <Text className="text-sm font-extrabold text-white">Submit request</Text>
              <Ionicons color="#FFFFFF" name="arrow-forward" size={19} />
            </>
          )}
        </Pressable>
          </>
        )}
      </ScrollView>

      <DonorSearchModal
        bloodType={submittedRequest?.bloodType ?? bloodType}
        error={matchScanError}
        fallbackHospitalCoordinates={facility?.location?.coordinates ?? [0, 0]}
        fallbackRadiusKm={submittedRequest?.radiusKm ?? urgencyRadiusKm[urgency]}
        hospitalName={facility?.fullName ?? 'Hospital'}
        loading={matchScanLoading}
        onClose={closeDonorSearch}
        onRetry={() => {
          if (submittedRequest && facility) {
            void scanForDonors(
              submittedRequest.id,
              facility.authToken,
              submittedRequest.radiusKm,
            );
          }
        }}
        requestReference={submittedRequest?.reference ?? reference}
        scan={matchScan}
        visible={Boolean(submittedRequest)}
      />
    </SafeAreaView>
  );
}
