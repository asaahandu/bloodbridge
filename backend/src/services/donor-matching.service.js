import { COMPATIBLE_DONOR_BLOOD_TYPES } from '../constants/blood-compatibility.js';

export const MATCHING_MODEL_VERSION = 'explainable-v1';

const URGENCY_WEIGHTS = {
  standard: {
    bloodCompatibility: 0.3,
    distance: 0.2,
    donationInterval: 0.15,
    responseReliability: 0.2,
    availability: 0.1,
    successfulDonations: 0.05,
  },
  urgent: {
    bloodCompatibility: 0.3,
    distance: 0.25,
    donationInterval: 0.15,
    responseReliability: 0.15,
    availability: 0.1,
    successfulDonations: 0.05,
  },
  critical: {
    bloodCompatibility: 0.3,
    distance: 0.3,
    donationInterval: 0.1,
    responseReliability: 0.1,
    availability: 0.15,
    successfulDonations: 0.05,
  },
};

const RARE_EXACT_MATCH_BONUS = {
  'O-': 0.08,
  'AB-': 0.08,
  'B-': 0.06,
  'A-': 0.05,
};

const WEEKDAY_NUMBERS = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function validDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function laterDate(...values) {
  return values
    .map(validDate)
    .filter(Boolean)
    .sort((left, right) => right.getTime() - left.getTime())[0];
}

function getLocalDayAndHour(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);

  return {
    day: WEEKDAY_NUMBERS[weekday] ?? date.getUTCDay(),
    hour: Number.isFinite(hour) ? hour : date.getUTCHours(),
  };
}

function matchesAvailability(preset, date, timeZone) {
  const { day, hour } = getLocalDayAndHour(date, timeZone);

  if (preset === 'weekdays') return day >= 1 && day <= 5;
  if (preset === 'weekends') return day === 0 || day === 6;
  if (preset === 'daytime') return hour >= 7 && hour < 18;
  if (preset === 'evenings') return hour >= 17 && hour < 23;
  return preset === 'anytime';
}

function getBloodCompatibilityScore(requestedBloodType, donorBloodType) {
  const exactMatch = requestedBloodType === donorBloodType;
  if (exactMatch) {
    return clamp(0.92 + (RARE_EXACT_MATCH_BONUS[requestedBloodType] ?? 0.03));
  }

  // Compatible O- is deliberately not given a rarity bonus when it is not an exact match.
  // This avoids consuming a scarce universal donor ahead of a suitable exact-match donor.
  return donorBloodType === 'O-' ? 0.68 : 0.76;
}

function getReliability(history = {}) {
  const notified = Math.max(0, Number(history.notifiedCount) || 0);
  const accepted = Math.max(0, Number(history.acceptedCount) || 0);
  const completed = Math.max(0, Number(history.completedCount) || 0);
  const acceptanceRate = (accepted + 1) / (notified + 2);
  const completionRate = (completed + 1) / (accepted + 2);

  return {
    acceptanceRate,
    completionRate,
    score: acceptanceRate * 0.55 + completionRate * 0.45,
  };
}

function roundFeature(value) {
  return Number(value.toFixed(4));
}

function scoreCandidate({
  bloodRequest,
  candidate,
  minimumIntervalDays,
  averageTravelSpeedKmh,
  timeZone,
  now,
}) {
  const compatibleTypes = COMPATIBLE_DONOR_BLOOD_TYPES[bloodRequest.bloodType] ?? [];
  if (!compatibleTypes.includes(candidate.bloodType)) {
    return { excludedReason: 'incompatible_blood_type' };
  }

  const maxTravelDistanceKm = candidate.donationProfile?.maxTravelDistanceKm;
  if (
    Number.isFinite(maxTravelDistanceKm) &&
    candidate.distanceKm > maxTravelDistanceKm
  ) {
    return { excludedReason: 'outside_donor_travel_preference' };
  }

  const lastDonationAt = laterDate(
    candidate.donationProfile?.lastDonationAt,
    candidate.history?.lastCompletedDonationAt,
  );
  const nextEligibleAt = lastDonationAt
    ? new Date(lastDonationAt.getTime() + minimumIntervalDays * 24 * 60 * 60 * 1000)
    : undefined;

  if (nextEligibleAt && nextEligibleAt > now) {
    return { excludedReason: 'donation_interval_not_met' };
  }

  const exactBloodType = candidate.bloodType === bloodRequest.bloodType;
  const bloodCompatibility = getBloodCompatibilityScore(
    bloodRequest.bloodType,
    candidate.bloodType,
  );
  const distance = clamp(1 - candidate.distanceKm / bloodRequest.radiusKm);
  const donationInterval = lastDonationAt ? 1 : 0.55;
  const availabilityPreset = candidate.donationProfile?.availabilityPreset;
  const availableNow = availabilityPreset
    ? matchesAvailability(availabilityPreset, now, timeZone)
    : undefined;
  const availability = availableNow === undefined ? 0.55 : availableNow ? 1 : 0.25;
  const reliability = getReliability(candidate.history);
  const successfulDonations = clamp(
    0.3 + (Number(candidate.history?.completedCount) || 0) / 7,
  );
  const weights = URGENCY_WEIGHTS[bloodRequest.urgency] ?? URGENCY_WEIGHTS.urgent;
  const rawScore =
    bloodCompatibility * weights.bloodCompatibility +
    distance * weights.distance +
    donationInterval * weights.donationInterval +
    reliability.score * weights.responseReliability +
    availability * weights.availability +
    successfulDonations * weights.successfulDonations;
  const estimatedTravelMinutes = Math.max(
    5,
    Math.ceil(((candidate.distanceKm / averageTravelSpeedKmh) * 60) / 5) * 5,
  );
  const reasons = [
    exactBloodType
      ? `Exact ${candidate.bloodType} blood-type match`
      : `Compatible ${candidate.bloodType} donor`,
    `${candidate.distanceKm.toFixed(1)} km away (roughly ${estimatedTravelMinutes} min)`,
    lastDonationAt
      ? `Known donation interval is clear as of ${nextEligibleAt.toISOString().slice(0, 10)}`
      : 'Last donation is not recorded; staff must verify eligibility',
  ];

  if (availableNow === true) reasons.push('Matches the donor\'s availability preference now');
  else if (availableNow === false) reasons.push('Outside the donor\'s preferred availability now');
  else reasons.push('Availability preference is not recorded');

  if ((candidate.history?.notifiedCount ?? 0) > 0) {
    reasons.push(
      `${Math.round(reliability.acceptanceRate * 100)}% smoothed historical response rate`,
    );
  }
  if ((candidate.history?.completedCount ?? 0) > 0) {
    reasons.push(`${candidate.history.completedCount} successful donation outcome(s) recorded`);
  }

  return {
    matchPercentage: Math.round(clamp(rawScore) * 100),
    estimatedTravelMinutes,
    reasons: reasons.slice(0, 5),
    eligibility: {
      status: lastDonationAt ? 'interval_clear' : 'needs_verification',
      ...(lastDonationAt ? { lastDonationAt: lastDonationAt.toISOString() } : {}),
      ...(nextEligibleAt ? { nextEligibleAt: nextEligibleAt.toISOString() } : {}),
    },
    features: {
      exactBloodType: exactBloodType ? 1 : 0,
      bloodCompatibility: roundFeature(bloodCompatibility),
      distanceKm: roundFeature(candidate.distanceKm),
      distanceScore: roundFeature(distance),
      donationIntervalVerified: lastDonationAt ? 1 : 0,
      availabilityScore: roundFeature(availability),
      historicalAcceptanceRate: roundFeature(reliability.acceptanceRate),
      historicalCompletionRate: roundFeature(reliability.completionRate),
      successfulDonations: Number(candidate.history?.completedCount) || 0,
      urgency: bloodRequest.urgency,
    },
  };
}

export function rankDonorCandidates({
  bloodRequest,
  candidates,
  minimumIntervalDays,
  averageTravelSpeedKmh,
  timeZone = 'Africa/Douala',
  now = new Date(),
}) {
  const eligible = [];
  const excluded = {};

  for (const candidate of candidates) {
    const result = scoreCandidate({
      bloodRequest,
      candidate,
      minimumIntervalDays,
      averageTravelSpeedKmh,
      timeZone,
      now,
    });

    if (result.excludedReason) {
      excluded[result.excludedReason] = (excluded[result.excludedReason] ?? 0) + 1;
      continue;
    }

    eligible.push({ ...candidate, ...result });
  }

  eligible.sort(
    (left, right) =>
      right.matchPercentage - left.matchPercentage || left.distanceKm - right.distanceKm,
  );

  return {
    rankedDonors: eligible.map((donor, index) => ({ ...donor, rank: index + 1 })),
    excluded,
  };
}
