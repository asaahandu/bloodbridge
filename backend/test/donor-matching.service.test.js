import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MATCHING_MODEL_VERSION,
  rankDonorCandidates,
} from '../src/services/donor-matching.service.js';

const request = {
  bloodType: 'A+',
  urgency: 'urgent',
  radiusKm: 20,
};
const now = new Date('2026-08-24T10:00:00.000Z');

function candidate(overrides = {}) {
  return {
    _id: overrides._id ?? 'donor-1',
    bloodType: overrides.bloodType ?? 'A+',
    coordinates: [11.5, 3.8],
    capturedAt: now,
    distanceKm: overrides.distanceKm ?? 4,
    donationProfile: overrides.donationProfile ?? {
      lastDonationAt: '2026-01-01T12:00:00.000Z',
      availabilityPreset: 'anytime',
      maxTravelDistanceKm: 25,
    },
    history: overrides.history ?? {
      notifiedCount: 4,
      acceptedCount: 2,
      completedCount: 1,
    },
  };
}

function rank(candidates) {
  return rankDonorCandidates({
    bloodRequest: request,
    candidates,
    minimumIntervalDays: 112,
    averageTravelSpeedKmh: 25,
    timeZone: 'Africa/Douala',
    now,
  });
}

test('ranks an exact, nearby donor ahead of a compatible, farther donor', () => {
  const result = rank([
    candidate({ _id: 'compatible', bloodType: 'O+', distanceKm: 8 }),
    candidate({ _id: 'exact', bloodType: 'A+', distanceKm: 2 }),
  ]);

  assert.equal(MATCHING_MODEL_VERSION, 'explainable-v1');
  assert.equal(result.rankedDonors[0]._id, 'exact');
  assert.equal(result.rankedDonors[0].rank, 1);
  assert.match(result.rankedDonors[0].reasons[0], /Exact A\+ blood-type match/);
});

test('hard-excludes donors whose known donation interval has not elapsed', () => {
  const result = rank([
    candidate({
      donationProfile: {
        lastDonationAt: '2026-08-01T12:00:00.000Z',
        availabilityPreset: 'anytime',
        maxTravelDistanceKm: 25,
      },
    }),
  ]);

  assert.equal(result.rankedDonors.length, 0);
  assert.equal(result.excluded.donation_interval_not_met, 1);
});

test('hard-excludes donors outside their saved travel preference', () => {
  const result = rank([
    candidate({
      distanceKm: 12,
      donationProfile: {
        lastDonationAt: '2026-01-01T12:00:00.000Z',
        availabilityPreset: 'anytime',
        maxTravelDistanceKm: 10,
      },
    }),
  ]);

  assert.equal(result.rankedDonors.length, 0);
  assert.equal(result.excluded.outside_donor_travel_preference, 1);
});

test('uses completed outcomes and response history to break otherwise equal matches', () => {
  const reliable = candidate({
    _id: 'reliable',
    history: { notifiedCount: 8, acceptedCount: 7, completedCount: 6 },
  });
  const newDonor = candidate({
    _id: 'new',
    history: { notifiedCount: 0, acceptedCount: 0, completedCount: 0 },
  });
  const result = rank([newDonor, reliable]);

  assert.equal(result.rankedDonors[0]._id, 'reliable');
  assert.ok(result.rankedDonors[0].matchPercentage > result.rankedDonors[1].matchPercentage);
  assert.equal(result.rankedDonors[0].features.successfulDonations, 6);
});
