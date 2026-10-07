import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { DonorMatchScan } from '@/lib/api';

import {
  DONOR_MAP_ZOOM_STEP_KM,
  DONOR_RADAR_PING_INTERVAL_MS,
  DONOR_SCAN_START_KM,
  DONOR_SCAN_STEP_KM,
  getDonorScanDurationMs,
} from './donor-search-config';
import { DonorSearchMap } from './DonorSearchMap';
import { RADAR_PING_SOURCE } from './radar-sound';

type DonorSearchModalProps = {
  bloodType: string;
  error?: string;
  fallbackHospitalCoordinates: [number, number];
  fallbackRadiusKm: number;
  hospitalName: string;
  loading: boolean;
  onClose: () => void;
  onRetry: () => void;
  requestReference: string;
  scan?: DonorMatchScan;
  visible: boolean;
};

function formatScanDistance(radiusKm: number) {
  if (radiusKm < 1) {
    return `${Math.max(10, Math.round(radiusKm * 1000))} m`;
  }

  return `${radiusKm.toFixed(2)} km`;
}

export function DonorSearchModal({
  bloodType,
  error,
  fallbackHospitalCoordinates,
  fallbackRadiusKm,
  hospitalName,
  loading,
  onClose,
  onRetry,
  requestReference,
  scan,
  visible,
}: DonorSearchModalProps) {
  const scanProgress = useRef(new Animated.Value(0)).current;
  const [scannedRadiusKm, setScannedRadiusKm] = useState(0);
  const radarPlayer = useAudioPlayer(RADAR_PING_SOURCE);
  const hospitalCoordinates = scan?.hospital.coordinates ?? fallbackHospitalCoordinates;
  const radiusKm = scan?.radiusKm ?? fallbackRadiusKm;
  const allDonors = scan?.donors ?? [];
  const startingVisualScale = Math.max(0.004, DONOR_SCAN_START_KM / radiusKm);
  const scanDurationMs = getDonorScanDurationMs(radiusKm);
  const completedMapZoomSteps = Math.floor(
    Math.max(0, scannedRadiusKm - DONOR_SCAN_START_KM) / DONOR_MAP_ZOOM_STEP_KM,
  );
  const mapViewRadiusKm = loading
    ? Math.min(
        radiusKm,
        DONOR_SCAN_START_KM + completedMapZoomSteps * DONOR_MAP_ZOOM_STEP_KM,
      )
    : radiusKm;
  const donors = loading
    ? allDonors.filter((donor) => donor.distanceKm <= scannedRadiusKm)
    : allDonors;

  useEffect(() => {
    if (!visible) {
      scanProgress.stopAnimation();
      scanProgress.setValue(0);
      setScannedRadiusKm(0);
      return;
    }

    if (!loading) {
      scanProgress.stopAnimation();
      scanProgress.setValue(1);
      setScannedRadiusKm(radiusKm);
      return;
    }

    scanProgress.setValue(0);
    setScannedRadiusKm(DONOR_SCAN_START_KM);
    const startedAt = Date.now();
    const totalSteps = Math.max(
      1,
      Math.round((radiusKm - DONOR_SCAN_START_KM) / DONOR_SCAN_STEP_KM),
    );
    const stepDurationMs = scanDurationMs / totalSteps;
    const updateScanDistance = () => {
      const completedSteps = Math.min(
        totalSteps,
        Math.floor((Date.now() - startedAt) / stepDurationMs),
      );
      const nextRadiusKm = Math.min(
        radiusKm,
        DONOR_SCAN_START_KM + completedSteps * DONOR_SCAN_STEP_KM,
      );

      setScannedRadiusKm(nextRadiusKm);
      scanProgress.setValue(completedSteps / totalSteps);
    };
    const distanceTimer = setInterval(
      updateScanDistance,
      Math.max(16, Math.min(100, stepDurationMs)),
    );

    return () => {
      clearInterval(distanceTimer);
    };
  }, [loading, radiusKm, scanDurationMs, scanProgress, visible]);

  useEffect(() => {
    radarPlayer.volume = 0.24;

    if (!visible || !loading) {
      radarPlayer.pause();
      void radarPlayer.seekTo(0);
      return;
    }

    let active = true;
    const playPing = async () => {
      try {
        await radarPlayer.seekTo(0);
        if (active) radarPlayer.play();
      } catch {
        // Some browsers block audio until they receive a direct user gesture.
      }
    };

    void playPing();
    const pingTimer = setInterval(() => {
      void playPing();
    }, DONOR_RADAR_PING_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(pingTimer);
      radarPlayer.pause();
      void radarPlayer.seekTo(0);
    };
  }, [loading, radarPlayer, visible]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <SafeAreaView className="flex-1 justify-end bg-black/50" edges={['top', 'bottom']}>
        <View className="max-h-[94%] overflow-hidden rounded-t-[30px] bg-canvas">
          <View className="flex-row items-start justify-between px-5 pb-4 pt-5">
            <View className="min-w-0 flex-1 pr-4">
              <Text className="text-[10px] font-extrabold tracking-[1.3px] text-blood-red">
                REQUEST SUBMITTED
              </Text>
              <Text className="mt-1 text-[23px] font-bold tracking-[-0.5px] text-ink">
                Searching for donors
              </Text>
              <Text className="mt-1 text-[11px] leading-[17px] text-muted" numberOfLines={2}>
                {requestReference} · {bloodType} · {radiusKm} km search radius
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close donor search"
              className="h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card active:opacity-70"
              onPress={onClose}>
              <Ionicons color="#121212" name="close" size={22} />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="pb-7" showsVerticalScrollIndicator={false}>
            <View className="relative mx-5 overflow-hidden rounded-[23px] border border-line bg-card">
              <DonorSearchMap
                donors={donors}
                hospitalCoordinates={hospitalCoordinates}
                hospitalName={hospitalName}
                radiusKm={radiusKm}
                showRadius={!loading}
                viewRadiusKm={mapViewRadiusKm}
              />
              {loading ? (
                <View
                  className="absolute inset-0 items-center justify-center"
                  pointerEvents="none">
                  <Animated.View
                    className="absolute h-[250px] w-[250px] rounded-full border-2"
                    style={{
                      backgroundColor: 'rgba(142, 23, 34, 0.10)',
                      borderColor: 'rgba(142, 23, 34, 0.75)',
                      opacity: scanProgress.interpolate({
                        inputRange: [0, 0.85, 1],
                        outputRange: [0.85, 0.55, 0.35],
                      }),
                      transform: [
                        {
                          scale: scanProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [startingVisualScale, 1],
                          }),
                        },
                      ],
                    }}
                  />
                  <View className="h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-blood-red shadow-lg">
                    <Ionicons color="#FFFFFF" name="business" size={23} />
                  </View>
                </View>
              ) : null}
            </View>

            <View className="mx-5 mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-2 rounded-[15px] border border-line bg-card px-4 py-3">
              <View className="flex-row items-center gap-2">
                <View className="h-3 w-3 rounded-full bg-blood-red" />
                <Text className="text-[10px] font-semibold text-ink">Hospital GPS</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="h-3 w-3 rounded-full bg-ink" />
                <Text className="text-[10px] font-semibold text-ink">Matching donor GPS</Text>
              </View>
            </View>

            <View className="mx-5 mt-4 rounded-[21px] bg-ink p-5">
              {loading ? (
                <View className="flex-row items-center gap-3">
                  <ActivityIndicator color="#F5A3AA" size="small" />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">Scanning the surrounding area</Text>
                    <Text className="mt-1 text-[10px] leading-[15px] text-[#AFAFAC]">
                      {scan
                        ? `${donors.length} eligible compatible ${donors.length === 1 ? 'donor' : 'donors'} found within ${formatScanDistance(scannedRadiusKm)}`
                        : `Expanding from ${formatScanDistance(scannedRadiusKm)} to ${radiusKm} km`}
                    </Text>
                  </View>
                </View>
              ) : error ? (
                <View>
                  <View className="flex-row items-start gap-3">
                    <Ionicons color="#F5A3AA" name="alert-circle-outline" size={21} />
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-white">Search could not finish</Text>
                      <Text className="mt-1 text-[10px] leading-[15px] text-[#CBCBC7]">{error}</Text>
                    </View>
                  </View>
                  <Pressable className="mt-4 self-start active:opacity-70" onPress={onRetry}>
                    <Text className="text-[10px] font-extrabold text-[#F5A3AA]">TRY AGAIN</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="flex-row items-center gap-4">
                  <Text className="text-[38px] font-extrabold leading-[42px] text-white">
                    {donors.length}
                  </Text>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">
                      {donors.length === 1 ? 'eligible donor ranked' : 'eligible donors ranked'}
                    </Text>
                    <Text className="mt-1 text-[10px] leading-[15px] text-[#AFAFAC]">
                      {scan?.candidateCount ?? donors.length} compatible GPS candidate(s) reviewed.
                      Clinical screening is still required.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {!loading && !error ? (
              <View className="mx-5 mt-4">
                <View className="flex-row items-end justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[17px] font-bold text-ink">Top ranked donors</Text>
                    <Text className="mt-1 text-[10px] leading-[15px] text-muted">
                      Ranked by compatibility, distance, donation interval, availability, and
                      recorded response outcomes. Percentages are comparison scores, not success
                      probabilities.
                    </Text>
                  </View>
                  <View className="rounded-lg bg-[#EFEFED] px-2.5 py-1.5">
                    <Text className="text-[8px] font-extrabold text-muted">
                      {scan?.modelVersion ?? 'EXPLAINABLE V1'}
                    </Text>
                  </View>
                </View>

                {donors.length === 0 ? (
                  <View className="mt-3 rounded-[17px] border border-line bg-card p-4">
                    <Text className="text-xs font-bold text-ink">No eligible ranked donors</Text>
                    <Text className="mt-1 text-[10px] leading-[15px] text-muted">
                      Candidates may be outside their travel preference or within a known donation
                      waiting interval.
                    </Text>
                  </View>
                ) : (
                  <View className="mt-3 gap-2.5">
                    {donors.slice(0, 10).map((donor) => (
                      <View
                        className="rounded-[18px] border border-line bg-card p-4"
                        key={donor.id}>
                        <View className="flex-row items-center gap-3">
                          <View className="h-11 w-11 items-center justify-center rounded-[13px] bg-ink">
                            <Text className="text-xs font-extrabold text-white">#{donor.rank}</Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-xs font-extrabold text-ink">
                              Anonymous {donor.bloodType} donor
                            </Text>
                            <Text className="mt-1 text-[10px] text-muted">
                              {donor.distanceKm.toFixed(1)} km · about{' '}
                              {donor.estimatedTravelMinutes} min
                            </Text>
                          </View>
                          <View className="rounded-[11px] bg-blood-red-soft px-3 py-2">
                            <Text className="text-xs font-extrabold text-blood-red">
                              {donor.matchPercentage}%
                            </Text>
                          </View>
                        </View>

                        <View className="mt-3 border-t border-line pt-3">
                          {donor.reasons.map((reason) => (
                            <View className="mb-1.5 flex-row items-start gap-2" key={reason}>
                              <Ionicons color="#8E1722" name="checkmark-circle" size={13} />
                              <Text className="flex-1 text-[10px] leading-[15px] text-muted">
                                {reason}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {scan && scan.candidateCount > donors.length ? (
                  <Text className="mt-3 text-[9px] leading-[14px] text-muted">
                    {scan.candidateCount - donors.length} candidate(s) were excluded by donation
                    interval or donor travel-preference gates.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View className="mx-5 mt-4 rounded-[17px] border border-line bg-card p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons color="#8E1722" name="location-outline" size={18} />
                <Text className="text-xs font-bold text-ink">Hospital position</Text>
              </View>
              <Text className="mt-2 text-[10px] text-muted">
                {hospitalCoordinates[1].toFixed(5)}, {hospitalCoordinates[0].toFixed(5)}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              className="mx-5 mt-5 h-13 items-center justify-center rounded-[15px] bg-blood-red active:bg-blood-red-dark"
              onPress={onClose}>
              <Text className="text-sm font-extrabold text-white">Done</Text>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
