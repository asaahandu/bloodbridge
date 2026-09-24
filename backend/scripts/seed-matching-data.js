import mongoose from 'mongoose';

import { env } from '../src/config/env.js';
import { DONOR_SEARCH_RADIUS_KM } from '../src/constants/blood-compatibility.js';
import { BLOOD_TYPES } from '../src/constants/blood-types.js';
import { BloodRequest } from '../src/models/blood-request.model.js';
import { DonorRequestActivity } from '../src/models/donor-request-activity.model.js';
import { User } from '../src/models/user.model.js';
import {
    MATCHING_MODEL_VERSION,
    rankDonorCandidates,
} from '../src/services/donor-matching.service.js';
import { hashPassword } from '../src/utils/password.js';

const DAY_MS = 24 * 60 * 60 * 1_000;
const HISTORICAL_REQUEST_COUNT = 40;
const ACTIVE_REQUEST_COUNT = 8;
const HISTORY_SPACING_DAYS = 23;
const DEFAULT_PASSWORD = 'BloodBridgeSeed123!';
const HOSPITAL_NAME = 'BloodBridge Yaoundé Seed Hospital';
const HOSPITAL_EMAIL = 'hospital@seed.bloodbridge.example';

const YAOUNDE_FACILITIES = [
  { name: 'Central', longitude: 11.5167, latitude: 3.8667 },
  { name: 'Bastos', longitude: 11.515, latitude: 3.899 },
  { name: 'Essos', longitude: 11.535, latitude: 3.874 },
  { name: 'Biyem-Assi', longitude: 11.479, latitude: 3.835 },
  { name: 'Mvan', longitude: 11.516, latitude: 3.795 },
  { name: 'Ngousso', longitude: 11.536, latitude: 3.897 },
  { name: 'Mendong', longitude: 11.459, latitude: 3.82 },
  { name: 'Ekounou', longitude: 11.539, latitude: 3.848 },
];

const DONORS = [
  {
    fullName: 'Erling Haaland',
    emailName: 'erling.haaland',
    bloodType: 'O+',
    dateOfBirth: '1994-07-21',
    neighborhood: 'Bastos',
    longitude: 11.515,
    latitude: 3.899,
  },
  {
    fullName: 'Phil Foden',
    emailName: 'phil.foden',
    bloodType: 'A+',
    dateOfBirth: '1997-05-28',
    neighborhood: 'Mvan',
    longitude: 11.516,
    latitude: 3.795,
  },
  {
    fullName: 'Rodri Hernández',
    emailName: 'rodri.hernandez',
    bloodType: 'O-',
    dateOfBirth: '1992-06-22',
    neighborhood: 'Nlongkak',
    longitude: 11.522,
    latitude: 3.884,
  },
  {
    fullName: 'Rúben Dias',
    emailName: 'ruben.dias',
    bloodType: 'A-',
    dateOfBirth: '1995-05-14',
    neighborhood: 'Odza',
    longitude: 11.527,
    latitude: 3.792,
  },
  {
    fullName: 'Jérémy Doku',
    emailName: 'jeremy.doku',
    bloodType: 'B+',
    dateOfBirth: '1998-05-27',
    neighborhood: 'Biyem-Assi',
    longitude: 11.479,
    latitude: 3.835,
  },
  {
    fullName: 'Bernardo Silva',
    emailName: 'bernardo.silva',
    bloodType: 'AB+',
    dateOfBirth: '1991-08-10',
    neighborhood: 'Emana',
    longitude: 11.514,
    latitude: 3.929,
  },
  {
    fullName: 'Joško Gvardiol',
    emailName: 'josko.gvardiol',
    bloodType: 'O+',
    dateOfBirth: '1998-01-23',
    neighborhood: 'Ekounou',
    longitude: 11.539,
    latitude: 3.848,
  },
  {
    fullName: 'Omar Marmoush',
    emailName: 'omar.marmoush',
    bloodType: 'B-',
    dateOfBirth: '1996-02-07',
    neighborhood: 'Mimboman',
    longitude: 11.555,
    latitude: 3.87,
  },
  {
    fullName: 'Rayan Cherki',
    emailName: 'rayan.cherki',
    bloodType: 'AB-',
    dateOfBirth: '1999-08-17',
    neighborhood: 'Essos',
    longitude: 11.535,
    latitude: 3.874,
  },
  {
    fullName: 'Tijjani Reijnders',
    emailName: 'tijjani.reijnders',
    bloodType: 'A+',
    dateOfBirth: '1993-07-29',
    neighborhood: 'Mokolo',
    longitude: 11.502,
    latitude: 3.867,
  },
  {
    fullName: 'Abdukodir Khusanov',
    emailName: 'abdukodir.khusanov',
    bloodType: 'O-',
    dateOfBirth: '1999-02-28',
    neighborhood: 'Etoudi',
    longitude: 11.521,
    latitude: 3.927,
  },
  {
    fullName: "Nico O'Reilly",
    emailName: 'nico.oreilly',
    bloodType: 'B+',
    dateOfBirth: '2000-03-21',
    neighborhood: 'Obili',
    longitude: 11.48,
    latitude: 3.857,
  },
  {
    fullName: 'Rico Lewis',
    emailName: 'rico.lewis',
    bloodType: 'AB+',
    dateOfBirth: '2000-11-21',
    neighborhood: 'Nsam',
    longitude: 11.508,
    latitude: 3.824,
  },
  {
    fullName: 'Savinho Moreira',
    emailName: 'savinho.moreira',
    bloodType: 'O+',
    dateOfBirth: '1999-04-10',
    neighborhood: 'Mendong',
    longitude: 11.459,
    latitude: 3.82,
  },
  {
    fullName: 'Matheus Nunes',
    emailName: 'matheus.nunes',
    bloodType: 'A-',
    dateOfBirth: '1995-08-27',
    neighborhood: 'Ngousso',
    longitude: 11.536,
    latitude: 3.897,
  },
  {
    fullName: 'Kevin De Bruyne',
    emailName: 'kevin.debruyne',
    bloodType: 'B+',
    dateOfBirth: '1989-06-28',
    neighborhood: 'Nkolbisson',
    longitude: 11.445,
    latitude: 3.875,
  },
  {
    fullName: 'Julián Álvarez',
    emailName: 'julian.alvarez',
    bloodType: 'O+',
    dateOfBirth: '1996-01-31',
    neighborhood: 'Ahala',
    longitude: 11.488,
    latitude: 3.786,
  },
  {
    fullName: 'Jack Grealish',
    emailName: 'jack.grealish',
    bloodType: 'AB-',
    dateOfBirth: '1993-09-10',
    neighborhood: 'Nsimeyong',
    longitude: 11.488,
    latitude: 3.831,
  },
  {
    fullName: 'Kyle Walker',
    emailName: 'kyle.walker',
    bloodType: 'B-',
    dateOfBirth: '1988-05-28',
    neighborhood: 'Etoa-Meki',
    longitude: 11.503,
    latitude: 3.883,
  },
  {
    fullName: 'Ederson Moraes',
    emailName: 'ederson.moraes',
    bloodType: 'A+',
    dateOfBirth: '1991-08-17',
    neighborhood: 'Olezoa',
    longitude: 11.488,
    latitude: 3.85,
  },
];

const AVAILABILITY_PRESETS = ['anytime', 'weekdays', 'weekends', 'daytime', 'evenings'];
const MAX_TRAVEL_DISTANCES_KM = [10, 25, 50];
const ACCEPTANCE_RATES = [0.92, 0.86, 0.8, 0.74, 0.68, 0.62, 0.56, 0.5, 0.44, 0.38];
const COMPLETION_RATES = [0.96, 0.9, 0.84, 0.78, 0.72, 0.66];
const WARDS = ['Emergency', 'Maternity', 'Surgery', 'Paediatrics', 'Haematology'];
const URGENCIES = ['standard', 'urgent', 'critical'];

function seedObjectId(namespace, index) {
  const namespaceHex = namespace.toString(16).padStart(2, '0');
  const indexHex = index.toString(16).padStart(20, '0');
  return new mongoose.Types.ObjectId(`bb${namespaceHex}${indexHex}`);
}

function addMilliseconds(date, milliseconds) {
  return new Date(date.getTime() + milliseconds);
}

function addDays(date, days) {
  return addMilliseconds(date, days * DAY_MS);
}

function addHours(date, hours) {
  return addMilliseconds(date, hours * 60 * 60 * 1_000);
}

function addMinutes(date, minutes) {
  return addMilliseconds(date, minutes * 60 * 1_000);
}

function haversineDistanceKm(left, right) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function makeRequestDocument({ index, hospitalId, createdAt, active }) {
  const urgency = URGENCIES[index % URGENCIES.length];
  const facility = YAOUNDE_FACILITIES[(index * 3) % YAOUNDE_FACILITIES.length];
  const neededInHours = urgency === 'critical' ? 8 : urgency === 'urgent' ? 36 : 96;
  const sequence = String(index + 1).padStart(3, '0');

  return {
    _id: seedObjectId(3, index + 1),
    hospitalId,
    hospitalName: HOSPITAL_NAME,
    bloodType: BLOOD_TYPES[(index * 3) % BLOOD_TYPES.length],
    unitsNeeded: 1 + (index % 4),
    internalReference: `SEED-${active ? 'LIVE' : 'TRAIN'}-${sequence}`,
    ward: WARDS[index % WARDS.length],
    urgency,
    status: active ? 'active' : 'cancelled',
    city: 'Yaoundé, Centre',
    address: `${facility.name}, Yaoundé (synthetic seed coordinate)`,
    facilityLocation: {
      type: 'Point',
      coordinates: [facility.longitude, facility.latitude],
      accuracy: 20,
    },
    ...(index % 3 === 0
      ? { rewardAmount: 5_000 + (index % 4) * 2_500, rewardCurrency: 'XAF' }
      : {}),
    neededBy: addHours(createdAt, neededInHours),
    createdAt,
    updatedAt: createdAt,
  };
}

function candidateFromDonor(donor, state, request) {
  const [longitude, latitude] = donor.location.coordinates;
  const [requestLongitude, requestLatitude] = request.facilityLocation.coordinates;

  return {
    _id: donor._id,
    bloodType: donor.bloodType,
    coordinates: [longitude, latitude],
    capturedAt: donor.location.capturedAt,
    distanceKm: haversineDistanceKm(
      { longitude, latitude },
      { longitude: requestLongitude, latitude: requestLatitude },
    ),
    donationProfile: {
      availabilityPreset: donor.donationProfile.availabilityPreset,
      maxTravelDistanceKm: donor.donationProfile.maxTravelDistanceKm,
      ...(state.lastCompletedDonationAt
        ? { lastDonationAt: state.lastCompletedDonationAt }
        : {}),
    },
    history: {
      notifiedCount: state.notifiedCount,
      acceptedCount: state.acceptedCount,
      completedCount: state.completedCount,
      noShowCount: state.noShowCount,
      ...(state.lastCompletedDonationAt
        ? { lastCompletedDonationAt: state.lastCompletedDonationAt }
        : {}),
    },
  };
}

function rankForRequest(request, donors, donorStates, now) {
  const radiusKm = DONOR_SEARCH_RADIUS_KM[request.urgency];
  const candidates = donors
    .map((donor) => candidateFromDonor(donor, donorStates.get(String(donor._id)), request))
    .filter((candidate) => candidate.distanceKm <= radiusKm);

  return rankDonorCandidates({
    bloodRequest: {
      bloodType: request.bloodType,
      urgency: request.urgency,
      radiusKm,
    },
    candidates,
    minimumIntervalDays: env.donationMinimumIntervalDays,
    averageTravelSpeedKmh: env.matchingAverageTravelSpeedKmh,
    timeZone: env.matchingTimeZone,
    now,
  });
}

function makeBaseActivity(request, rankedDonor, notifiedAt) {
  return {
    requestId: request._id,
    hospitalId: request.hospitalId,
    donorId: rankedDonor._id,
    notifiedAt,
    pushStatus: 'skipped',
    matchRank: rankedDonor.rank,
    matchPercentage: rankedDonor.matchPercentage,
    matchingModelVersion: MATCHING_MODEL_VERSION,
    matchingFeatures: rankedDonor.features,
    matchingReasons: rankedDonor.reasons,
    matchedAt: notifiedAt,
    createdAt: notifiedAt,
    updatedAt: notifiedAt,
  };
}

function simulateHistoricalRequest({ request, donorsById, donorStates, random }) {
  const { rankedDonors } = rankForRequest(
    request,
    [...donorsById.values()],
    donorStates,
    request.createdAt,
  );
  const activities = [];
  let completedUnits = 0;

  for (const rankedDonor of rankedDonors) {
    const donorId = String(rankedDonor._id);
    const donor = donorsById.get(donorId);
    const state = donorStates.get(donorId);
    const readAt = addMinutes(request.createdAt, 5 + Math.floor(random() * 115));
    const activity = {
      ...makeBaseActivity(request, rankedDonor, request.createdAt),
      ...(random() < 0.92 ? { readAt } : {}),
    };

    state.notifiedCount += 1;
    if (random() < donor.acceptanceRate) {
      const respondedAt = addMinutes(readAt, 5 + Math.floor(random() * 180));
      activity.decision = 'accepted';
      activity.respondedAt = respondedAt;
      activity.updatedAt = respondedAt;
      state.acceptedCount += 1;

      if (completedUnits < request.unitsNeeded && random() < 0.86) {
        const confirmedAt = addMinutes(respondedAt, 10 + Math.floor(random() * 120));
        const outcomeRecordedAt = addHours(confirmedAt, 1 + Math.floor(random() * 8));
        const outcome = random() < donor.completionRate ? 'completed' : 'no_show';
        activity.confirmedAt = confirmedAt;
        activity.outcome = outcome;
        activity.outcomeRecordedAt = outcomeRecordedAt;
        activity.updatedAt = outcomeRecordedAt;

        if (outcome === 'completed') {
          completedUnits += 1;
          state.completedCount += 1;
          state.lastCompletedDonationAt = outcomeRecordedAt;
        } else {
          state.noShowCount += 1;
        }
      }
    } else {
      const respondedAt = addMinutes(readAt, 5 + Math.floor(random() * 240));
      activity.decision = 'declined';
      activity.respondedAt = respondedAt;
      activity.updatedAt = respondedAt;
    }

    activities.push(activity);
  }

  request.status = completedUnits >= request.unitsNeeded ? 'fulfilled' : 'cancelled';
  request.updatedAt = request.neededBy;
  return activities;
}

function buildSeedDataset(now = new Date()) {
  const random = createRandom(0xb100d123);
  const hospitalId = seedObjectId(1, 1);
  const historicalStart = addDays(now, -HISTORICAL_REQUEST_COUNT * HISTORY_SPACING_DAYS);
  const userCreatedAt = addDays(historicalStart, -60);
  const donors = DONORS.map((definition, index) => ({
    _id: seedObjectId(2, index + 1),
    fullName: definition.fullName,
    email: `${definition.emailName}@seed.bloodbridge.example`,
    phone: `+237000${String(index + 1).padStart(6, '0')}`,
    dateOfBirth: new Date(`${definition.dateOfBirth}T00:00:00.000Z`),
    gender: 'male',
    cityRegion: `${definition.neighborhood}, Yaoundé`,
    role: 'donor',
    bloodType: definition.bloodType,
    receivesAlerts: true,
    donationProfile: {
      availabilityPreset: AVAILABILITY_PRESETS[index % AVAILABILITY_PRESETS.length],
      maxTravelDistanceKm:
        MAX_TRAVEL_DISTANCES_KM[index % MAX_TRAVEL_DISTANCES_KM.length],
    },
    notificationPreferences: { pushEnabled: false },
    expoPushTokens: [],
    termsAcceptedAt: userCreatedAt,
    location: {
      type: 'Point',
      coordinates: [definition.longitude, definition.latitude],
      accuracy: 15 + (index % 6) * 5,
      capturedAt: now,
    },
    acceptanceRate: ACCEPTANCE_RATES[index % ACCEPTANCE_RATES.length],
    completionRate: COMPLETION_RATES[(index * 2) % COMPLETION_RATES.length],
    createdAt: userCreatedAt,
    updatedAt: now,
  }));
  const donorsById = new Map(donors.map((donor) => [String(donor._id), donor]));
  const donorStates = new Map(
    donors.map((donor, index) => [
      String(donor._id),
      {
        notifiedCount: 0,
        acceptedCount: 0,
        completedCount: 0,
        noShowCount: 0,
        ...(index % 6 === 0
          ? { lastCompletedDonationAt: addDays(historicalStart, index % 12 === 0 ? -56 : -140) }
          : {}),
      },
    ]),
  );
  const requests = [];
  const activities = [];

  for (let index = 0; index < HISTORICAL_REQUEST_COUNT; index += 1) {
    const createdAt = addDays(
      now,
      -(HISTORICAL_REQUEST_COUNT - index) * HISTORY_SPACING_DAYS,
    );
    createdAt.setUTCHours([7, 12, 17, 20][index % 4], (index * 7) % 60, 0, 0);
    const request = makeRequestDocument({ index, hospitalId, createdAt, active: false });
    requests.push(request);
    activities.push(
      ...simulateHistoricalRequest({ request, donorsById, donorStates, random }),
    );
  }

  for (let activeIndex = 0; activeIndex < ACTIVE_REQUEST_COUNT; activeIndex += 1) {
    const index = HISTORICAL_REQUEST_COUNT + activeIndex;
    const createdAt = addHours(now, -(activeIndex + 1) * 3);
    const request = makeRequestDocument({ index, hospitalId, createdAt, active: true });
    const neededInHours =
      request.urgency === 'critical' ? 8 : request.urgency === 'urgent' ? 36 : 96;
    request.neededBy = addHours(now, neededInHours + activeIndex * 2);
    request.updatedAt = now;
    const { rankedDonors } = rankForRequest(request, donors, donorStates, now);
    requests.push(request);
    activities.push(
      ...rankedDonors.map((rankedDonor) => makeBaseActivity(request, rankedDonor, createdAt)),
    );
  }

  for (const donor of donors) {
    const state = donorStates.get(String(donor._id));
    if (state.lastCompletedDonationAt) {
      donor.donationProfile.lastDonationAt = state.lastCompletedDonationAt;
    }
  }

  const labelledActivities = activities.filter(
    (activity) => activity.outcome || activity.decision === 'declined',
  );
  const summary = {
    donors: donors.length,
    historicalRequests: HISTORICAL_REQUEST_COUNT,
    activeRequests: ACTIVE_REQUEST_COUNT,
    matchingActivities: activities.length,
    labelledExamples: labelledActivities.length,
    completedExamples: labelledActivities.filter((activity) => activity.outcome === 'completed')
      .length,
    negativeExamples: labelledActivities.filter(
      (activity) => activity.outcome === 'no_show' || activity.decision === 'declined',
    ).length,
  };

  if (summary.donors !== 20) throw new Error('The matching seed must contain exactly 20 donors.');
  if (summary.labelledExamples < 100) {
    throw new Error('The generated dataset must contain at least 100 labelled examples.');
  }

  return {
    now,
    hospital: {
      _id: hospitalId,
      fullName: HOSPITAL_NAME,
      email: HOSPITAL_EMAIL,
      phone: '+237000000000',
      cityRegion: 'Yaoundé, Centre',
      role: 'hospital',
      notificationPreferences: { pushEnabled: false, emailEnabled: false },
      expoPushTokens: [],
      termsAcceptedAt: userCreatedAt,
      location: {
        type: 'Point',
        coordinates: [YAOUNDE_FACILITIES[0].longitude, YAOUNDE_FACILITIES[0].latitude],
        accuracy: 12,
        capturedAt: now,
      },
      createdAt: userCreatedAt,
      updatedAt: now,
    },
    donors,
    requests,
    activities,
    summary,
  };
}

function databaseDocument(user, passwordHash) {
  const { acceptanceRate, completionRate, ...document } = user;
  return { ...document, passwordHash };
}

async function validateUserDocuments(users) {
  await Promise.all(users.map((user) => new User(user).validate()));
}

async function applySeed(dataset, password) {
  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDb,
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 30_000,
  });

  const passwordHash = await hashPassword(password);
  const userDocuments = [
    databaseDocument(dataset.hospital, passwordHash),
    ...dataset.donors.map((donor) => databaseDocument(donor, passwordHash)),
  ];
  await validateUserDocuments(userDocuments);

  await User.collection.bulkWrite(
    userDocuments.map((document) => ({
      replaceOne: {
        filter: { _id: document._id },
        replacement: document,
        upsert: true,
      },
    })),
  );

  await BloodRequest.collection.bulkWrite(
    dataset.requests.map((request) => ({
      replaceOne: {
        filter: { _id: request._id },
        replacement: request,
        upsert: true,
      },
    })),
  );

  const requestIds = dataset.requests.map((request) => request._id);
  await DonorRequestActivity.deleteMany({ requestId: { $in: requestIds } });
  await DonorRequestActivity.insertMany(dataset.activities, { ordered: false });
}

async function main() {
  const shouldApply = process.argv.includes('--apply');
  const allowProduction = process.argv.includes('--allow-production');
  const now = new Date();
  now.setMilliseconds(0);
  const dataset = buildSeedDataset(now);
  const password = process.env.SEED_MATCHING_PASSWORD?.trim() || DEFAULT_PASSWORD;

  if (!shouldApply) {
    console.log(JSON.stringify({ mode: 'preview', ...dataset.summary }, null, 2));
    console.log('No database changes were made. Add --apply to write this dataset.');
    return;
  }

  if (env.nodeEnv === 'production' && !allowProduction) {
    throw new Error(
      'Refusing to seed NODE_ENV=production. Use a development database or add ' +
        '--allow-production only after confirming the target database.',
    );
  }

  await applySeed(dataset, password);
  console.log(JSON.stringify({ mode: 'applied', database: env.mongodbDb, ...dataset.summary }, null, 2));
  console.log(`Hospital login: ${HOSPITAL_EMAIL}`);
  console.log('Donor logins:');
  for (const donor of dataset.donors) {
    console.log(`- ${donor.fullName}: ${donor.email}`);
  }
  console.log(`Shared seed password: ${password}`);
  console.log('Push notifications are disabled for all seed accounts.');
}

try {
  await main();
} finally {
  await mongoose.disconnect();
}
