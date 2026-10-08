import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
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
    deleteHospitalCampaign,
    type CampaignRecord,
    type DonorMatchScan,
    draftBloodRequest,
    getHospitalRequestDonorMatches,
    listHospitalCampaigns,
    updateHospitalCampaign,
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
  const [campaignImages, setCampaignImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignError, setCampaignError] = useState('');
  const [campaignSuccess, setCampaignSuccess] = useState('');
  const [campaignListError, setCampaignListError] = useState('');
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<CampaignRecord | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editKeepImageIndices, setEditKeepImageIndices] = useState<number[]>([]);
  const [editNewImages, setEditNewImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
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
          if (hospital) {
            setCampaignLocation((current) => current || hospital.cityRegion);
            setCampaignsLoading(true);
            void listHospitalCampaigns(hospital.authToken)
              .then((loadedCampaigns) => {
                if (active) {
                  setCampaigns((current) => {
                    const loadedIds = new Set(loadedCampaigns.map((campaign) => campaign.id));
                    return [
                      ...current.filter((campaign) => !loadedIds.has(campaign.id)),
                      ...loadedCampaigns,
                    ];
                  });
                }
              })
              .catch((error: unknown) => {
                if (active) {
                  setCampaignListError(
                    error instanceof Error ? error.message : 'Unable to load your campaigns.',
                  );
                }
              })
              .finally(() => {
                if (active) setCampaignsLoading(false);
              });
          }
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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: maximumCampaignImages - campaignImages.length,
        orderedSelection: true,
      });
      if (result.canceled) return;

      const nextImages = [...campaignImages, ...result.assets];
      if (nextImages.length > maximumCampaignImages) {
        setCampaignError('Choose no more than five images.');
        return;
      }
      if (nextImages.some((image) => (image.fileSize ?? 0) > maximumCampaignImageSize)) {
        setCampaignError('Each image must be 5 MB or smaller.');
        return;
      }
      if (nextImages.reduce((total, image) => total + (image.fileSize ?? 0), 0) > maximumCampaignImagesSize) {
        setCampaignError('Images must total 10 MB or less.');
        return;
      }

      setCampaignImages(nextImages);
    } catch (error) {
      setCampaignError(
        error instanceof Error ? error.message : 'Unable to open the photo library. Please try again.',
      );
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
      const createdCampaign = await createHospitalCampaign(facility.authToken, {
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
      setCampaigns((current) => [
        {
          ...createdCampaign,
          hospitalName: facility.fullName,
          hospital: {
            name: facility.fullName,
            email: facility.email,
            phone: facility.phone,
            cityRegion: facility.cityRegion,
            verificationStatus: facility.hospitalVerificationStatus ?? 'unverified',
          },
          images: createdCampaign.images.map((image, index) => ({ ...image, index })),
        },
        ...current,
      ]);
      setCampaignSuccess('Campaign created and saved successfully.');
    } catch (error) {
      setCampaignError(
        error instanceof Error ? error.message : 'Unable to save the campaign. Please try again.',
      );
    } finally {
      setCampaignSubmitting(false);
    }
  };

  const openCampaignEditor = (campaign: CampaignRecord) => {
    setEditingCampaign(campaign);
    setEditTitle(campaign.title);
    setEditDate(campaign.date.slice(0, 10));
    setEditLocation(campaign.location);
    setEditDescription(campaign.description);
    setEditKeepImageIndices(campaign.images.map((image) => image.index));
    setEditNewImages([]);
    setEditError('');
    setDeleteConfirm(false);
  };

  const closeCampaignEditor = () => {
    if (editSubmitting || deleteSubmitting) return;
    setEditingCampaign(null);
    setDeleteConfirm(false);
    setEditError('');
  };

  const chooseEditCampaignImages = async () => {
    const remainingSlots =
      maximumCampaignImages - editKeepImageIndices.length - editNewImages.length;
    if (campaignImagesLoading || remainingSlots <= 0) return;

    setCampaignImagesLoading(true);
    setEditError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        orderedSelection: true,
      });
      if (result.canceled) return;

      const nextImages = [...editNewImages, ...result.assets];
      if (
        nextImages.some((image) => (image.fileSize ?? 0) > maximumCampaignImageSize)
      ) {
        setEditError('Each image must be 5 MB or smaller.');
        return;
      }
      const retainedSize = editingCampaign?.images.reduce(
        (total, image) =>
          editKeepImageIndices.includes(image.index) ? total + image.size : total,
        0,
      ) ?? 0;
      if (
        retainedSize +
          nextImages.reduce((total, image) => total + (image.fileSize ?? 0), 0) >
        maximumCampaignImagesSize
      ) {
        setEditError('Images must total 10 MB or less.');
        return;
      }
      setEditNewImages(nextImages);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : 'Unable to open the photo library. Please try again.',
      );
    } finally {
      setCampaignImagesLoading(false);
    }
  };

  const saveCampaignEdits = async () => {
    if (!editingCampaign || !facility || editSubmitting) return;
    setEditError('');
    if (!editTitle.trim()) {
      setEditError('Enter a campaign title.');
      return;
    }
    if (!isValidCampaignDate(editDate)) {
      setEditError('Enter a valid campaign date in YYYY-MM-DD format.');
      return;
    }
    if (!editLocation.trim()) {
      setEditError('Enter the campaign location.');
      return;
    }
    if (!editDescription.trim()) {
      setEditError('Add a description for the campaign.');
      return;
    }

    setEditSubmitting(true);
    try {
      const updatedCampaign = await updateHospitalCampaign(
        facility.authToken,
        editingCampaign.id,
        {
          title: editTitle.trim(),
          date: editDate,
          location: editLocation.trim(),
          description: editDescription.trim(),
          images: editNewImages,
        },
        editKeepImageIndices,
      );
      setCampaigns((current) =>
        current.map((campaign) =>
          campaign.id === updatedCampaign.id ? updatedCampaign : campaign,
        ),
      );
      setEditingCampaign(null);
      setEditNewImages([]);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : 'Unable to update the campaign. Please try again.',
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const removeCampaign = async () => {
    if (!editingCampaign || !facility || deleteSubmitting) return;
    setDeleteSubmitting(true);
    setEditError('');
    try {
      await deleteHospitalCampaign(facility.authToken, editingCampaign.id);
      setCampaigns((current) =>
        current.filter((campaign) => campaign.id !== editingCampaign.id),
      );
      setEditingCampaign(null);
      setDeleteConfirm(false);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : 'Unable to delete the campaign. Please try again.',
      );
      setDeleteConfirm(false);
    } finally {
      setDeleteSubmitting(false);
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
                      accessibilityLabel={image.fileName ?? 'Selected campaign image'}
                      className="h-[76px] w-[76px] rounded-[10px] bg-[#F1F1EF]"
                      source={{ uri: image.uri }}
                    />
                    <Pressable
                      accessibilityLabel={`Remove ${image.fileName ?? 'selected image'}`}
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
              disabled={campaignSubmitting}
              onPress={createCampaign}>
              {campaignSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text className="text-xs font-extrabold text-white">Create campaign</Text>
                  <Ionicons color="#FFFFFF" name="arrow-forward" size={17} />
                </>
              )}
            </Pressable>

            <View className="border-t border-line pt-5">
              <View className="mb-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-sm font-bold text-ink">Your campaigns</Text>
                  <Text className="mt-1 text-[10px] text-muted">
                    Campaigns created by your hospital
                  </Text>
                </View>
                <Text className="text-[10px] font-semibold text-muted">
                  {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'}
                </Text>
              </View>

              {campaignsLoading ? (
                <View className="flex-row items-center gap-2 rounded-[13px] bg-[#FAFAF9] p-4">
                  <ActivityIndicator color="#8E1722" size="small" />
                  <Text className="text-[11px] text-muted">Loading your campaigns…</Text>
                </View>
              ) : campaignListError ? (
                <View className="rounded-[13px] bg-error-soft p-3">
                  <Text className="text-[11px] font-semibold text-error">
                    {campaignListError}
                  </Text>
                </View>
              ) : campaigns.length === 0 ? (
                <View className="items-center rounded-[13px] bg-[#FAFAF9] px-4 py-6">
                  <Ionicons color="#8B8B88" name="megaphone-outline" size={22} />
                  <Text className="mt-2 text-[11px] font-semibold text-muted">
                    No campaigns created yet
                  </Text>
                </View>
              ) : (
                <View className="gap-2.5">
                  {campaigns.map((campaign) => (
                    <Pressable
                      accessibilityLabel={`Edit campaign ${campaign.title}`}
                      accessibilityRole="button"
                      className="flex-row items-start gap-3 rounded-[15px] border border-line bg-[#FAFAF9] p-3.5 active:opacity-75"
                      key={campaign.id}
                      onPress={() => openCampaignEditor(campaign)}>
                      <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-blood-red-soft">
                        <Ionicons color="#8E1722" name="megaphone-outline" size={19} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-xs font-bold text-ink" numberOfLines={2}>
                          {campaign.title}
                        </Text>
                        <Text className="mt-1 text-[10px] text-muted" numberOfLines={1}>
                          {new Intl.DateTimeFormat(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'UTC',
                          }).format(new Date(campaign.date))} · {campaign.location}
                        </Text>
                        <Text
                          className="mt-1 text-[10px] leading-[15px] text-muted"
                          numberOfLines={2}>
                          {campaign.description}
                        </Text>
                        {campaign.images.length > 0 ? (
                          <Text className="mt-1 text-[9px] font-semibold text-blood-red">
                            {campaign.images.length} {campaign.images.length === 1 ? 'image' : 'images'}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons color="#737373" name="create-outline" size={17} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
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

      <Modal
        animationType="slide"
        onRequestClose={closeCampaignEditor}
        transparent
        visible={Boolean(editingCampaign)}>
        <View className="flex-1 justify-end bg-black/50">
          <SafeAreaView className="max-h-[92%] rounded-t-[24px] bg-canvas" edges={['bottom']}>
            <View className="flex-row items-center justify-between border-b border-line px-5 py-4">
              <View>
                <Text className="text-[16px] font-extrabold text-ink">Edit campaign</Text>
                <Text className="mt-1 text-[10px] text-muted">
                  Update campaign details and photos
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close campaign editor"
                accessibilityRole="button"
                className="h-9 w-9 items-center justify-center rounded-full bg-[#F1F1EF]"
                disabled={editSubmitting || deleteSubmitting}
                onPress={closeCampaignEditor}>
                <Ionicons color="#292929" name="close" size={20} />
              </Pressable>
            </View>

            <ScrollView
              className="px-5"
              contentContainerClassName="gap-4 py-5"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View>
                <Text className="mb-2 text-xs font-bold text-ink">Campaign title</Text>
                <TextInput
                  accessibilityLabel="Edit campaign title"
                  autoCapitalize="sentences"
                  className="h-12 rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink"
                  maxLength={100}
                  onChangeText={setEditTitle}
                  value={editTitle}
                />
              </View>

              <View>
                <Text className="mb-2 text-xs font-bold text-ink">Date</Text>
                <TextInput
                  accessibilityLabel="Edit campaign date"
                  className="h-12 rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  onChangeText={setEditDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#8B8B88"
                  value={editDate}
                />
              </View>

              <View>
                <Text className="mb-2 text-xs font-bold text-ink">Location</Text>
                <TextInput
                  accessibilityLabel="Edit campaign location"
                  autoCapitalize="words"
                  className="h-12 rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink"
                  maxLength={160}
                  onChangeText={setEditLocation}
                  value={editLocation}
                />
              </View>

              <View>
                <Text className="mb-2 text-xs font-bold text-ink">Description</Text>
                <TextInput
                  accessibilityLabel="Edit campaign description"
                  className="min-h-[112px] rounded-[13px] border border-line bg-white px-3.5 py-3 text-sm leading-5 text-ink"
                  maxLength={1000}
                  multiline
                  onChangeText={setEditDescription}
                  textAlignVertical="top"
                  value={editDescription}
                />
                <Text className="mt-1 text-right text-[10px] text-muted">
                  {editDescription.length}/1000
                </Text>
              </View>

              <View>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-xs font-bold text-ink">Campaign images</Text>
                  <Text className="text-[10px] text-muted">
                    {editKeepImageIndices.length + editNewImages.length}/{maximumCampaignImages}
                  </Text>
                </View>
                {editingCampaign?.images.length ? (
                  <View className="mb-2 gap-2">
                    {editingCampaign.images.map((image) => {
                      const retained = editKeepImageIndices.includes(image.index);
                      return (
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: retained }}
                          className={`flex-row items-center gap-2 rounded-[11px] border p-3 ${
                            retained ? 'border-line bg-white' : 'border-[#E7C4C7] bg-blood-red-soft'
                          }`}
                          key={`${editingCampaign.id}-${image.index}`}
                          onPress={() =>
                            setEditKeepImageIndices((current) =>
                              retained
                                ? current.filter((index) => index !== image.index)
                                : [...current, image.index].sort((a, b) => a - b),
                            )
                          }>
                          <Ionicons
                            color={retained ? '#1F6A4C' : '#8E1722'}
                            name={retained ? 'checkbox' : 'square-outline'}
                            size={17}
                          />
                          <Text className="flex-1 text-[11px] text-ink" numberOfLines={1}>
                            {image.name}
                          </Text>
                          <Text className="text-[9px] text-muted">
                            {(image.size / (1024 * 1024)).toFixed(1)} MB
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="mb-2 text-[10px] text-muted">No saved images.</Text>
                )}
                {editNewImages.map((image, index) => (
                  <View
                    className="mb-2 flex-row items-center gap-2 rounded-[11px] border border-line bg-white p-2"
                    key={`${image.uri}-${index}`}>
                    <Image
                      accessibilityLabel={image.fileName ?? 'New campaign image'}
                      className="h-10 w-10 rounded-[8px] bg-[#F1F1EF]"
                      source={{ uri: image.uri }}
                    />
                    <Text className="flex-1 text-[10px] text-ink" numberOfLines={1}>
                      {image.fileName ?? `New image ${index + 1}`}
                    </Text>
                    <Pressable
                      accessibilityLabel={`Remove ${image.fileName ?? 'new image'}`}
                      accessibilityRole="button"
                      onPress={() =>
                        setEditNewImages((current) =>
                          current.filter((_, imageIndex) => imageIndex !== index),
                        )
                      }>
                      <Ionicons color="#8E1722" name="close-circle-outline" size={20} />
                    </Pressable>
                  </View>
                ))}
                {editKeepImageIndices.length + editNewImages.length < maximumCampaignImages ? (
                  <Pressable
                    accessibilityRole="button"
                    className="h-11 flex-row items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#D8B7BA] bg-blood-red-soft"
                    disabled={campaignImagesLoading}
                    onPress={() => void chooseEditCampaignImages()}>
                    {campaignImagesLoading ? (
                      <ActivityIndicator color="#8E1722" size="small" />
                    ) : (
                      <>
                        <Ionicons color="#8E1722" name="images-outline" size={17} />
                        <Text className="text-[11px] font-bold text-blood-red">Add photos</Text>
                      </>
                    )}
                  </Pressable>
                ) : null}
              </View>

              {editError ? (
                <View className="flex-row items-start gap-2 rounded-[12px] bg-error-soft p-3">
                  <Ionicons color="#B42318" name="alert-circle-outline" size={17} />
                  <Text className="flex-1 text-[11px] font-semibold leading-[16px] text-error">
                    {editError}
                  </Text>
                </View>
              ) : null}

              {deleteConfirm ? (
                <View className="gap-3 rounded-[14px] border border-[#E7C4C7] bg-blood-red-soft p-3.5">
                  <Text className="text-xs font-bold text-ink">Delete this campaign?</Text>
                  <Text className="text-[10px] leading-[15px] text-muted">
                    This permanently removes the campaign and its saved images.
                  </Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      accessibilityRole="button"
                      className="h-10 flex-1 items-center justify-center rounded-[11px] bg-white"
                      disabled={deleteSubmitting}
                      onPress={() => setDeleteConfirm(false)}>
                      <Text className="text-[11px] font-bold text-ink">Keep campaign</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      className="h-10 flex-1 flex-row items-center justify-center gap-2 rounded-[11px] bg-[#B42318]"
                      disabled={deleteSubmitting}
                      onPress={() => void removeCampaign()}>
                      {deleteSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text className="text-[11px] font-bold text-white">Delete permanently</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View className="flex-row gap-2">
                  <Pressable
                    accessibilityRole="button"
                    className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[13px] border border-[#E7C4C7] bg-white"
                    disabled={editSubmitting || deleteSubmitting}
                    onPress={() => setDeleteConfirm(true)}>
                    <Ionicons color="#B42318" name="trash-outline" size={17} />
                    <Text className="text-xs font-bold text-[#B42318]">Delete</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    className="h-12 flex-[1.5] flex-row items-center justify-center gap-2 rounded-[13px] bg-ink active:opacity-75"
                    disabled={editSubmitting || deleteSubmitting}
                    onPress={() => void saveCampaignEdits()}>
                    {editSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text className="text-xs font-extrabold text-white">Save changes</Text>
                        <Ionicons color="#FFFFFF" name="checkmark" size={17} />
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
