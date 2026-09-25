import { env } from '../config/env.js';
import {
    COMPATIBLE_DONOR_BLOOD_TYPES,
    DONOR_SEARCH_RADIUS_KM,
} from '../constants/blood-compatibility.js';
import { AIResult } from '../models/ai-result.model.js';
import { BloodRequest } from '../models/blood-request.model.js';
import { DonorRequestActivity } from '../models/donor-request-activity.model.js';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { MATCHING_MODEL_VERSION, rankDonorCandidates } from './donor-matching.service.js';
import {
    dispatchMatchNotifications,
    dispatchRequestEvent,
} from './notification.service.js';

function emptyDonorProgress() {
  return { notified: 0, responded: 0, confirmed: 0 };
}

async function addDonorProgress(bloodRequests) {
  if (bloodRequests.length === 0) return [];

  const requestIds = bloodRequests.map((request) => request._id);
  const activities = await DonorRequestActivity.find({ requestId: { $in: requestIds } })
    .select('requestId respondedAt confirmedAt')
    .lean();
  const progressByRequest = new Map();

  for (const activity of activities) {
    const requestId = String(activity.requestId);
    const progress = progressByRequest.get(requestId) ?? emptyDonorProgress();
    progress.notified += 1;
    if (activity.respondedAt) progress.responded += 1;
    if (activity.confirmedAt) progress.confirmed += 1;
    progressByRequest.set(requestId, progress);
  }

  return bloodRequests.map((request) => ({
    ...request,
    donorProgress: progressByRequest.get(String(request._id)) ?? emptyDonorProgress(),
  }));
}

export async function createBloodRequest(payload, hospital) {
  if (!hospital.location) {
    throw new AppError('The hospital must have a saved GPS location before creating a request', 400);
  }

  return BloodRequest.create({
    hospitalId: hospital._id,
    hospitalName: hospital.fullName,
    city: hospital.cityRegion,
    facilityLocation: {
      type: 'Point',
      coordinates: [...hospital.location.coordinates],
      ...(hospital.location.accuracy == null ? {} : { accuracy: hospital.location.accuracy }),
    },
    bloodType: payload.bloodType,
    unitsNeeded: payload.unitsNeeded,
    urgency: payload.urgency,
    internalReference: payload.internalReference,
    ...(payload.ward ? { ward: payload.ward } : {}),
    ...(payload.rewardAmount == null
      ? {}
      : { rewardAmount: payload.rewardAmount, rewardCurrency: 'XAF' }),
    neededBy: payload.neededBy,
  });
}

export async function listHospitalBloodRequests(hospitalId, status = 'all') {
  const query = { hospitalId };

  if (status === 'active') query.status = 'active';
  else if (status === 'history') query.status = { $in: ['fulfilled', 'cancelled'] };
  else if (status !== 'all') throw new AppError('Status must be active, history, or all', 400);

  const bloodRequests = await BloodRequest.find(query).sort({ createdAt: -1 }).limit(100).lean();
  return addDonorProgress(bloodRequests);
}

export async function getHospitalBloodRequest(requestId, hospitalId) {
  const request = await BloodRequest.findOne({ _id: requestId, hospitalId }).lean();
  if (!request) throw new AppError('Blood request not found', 404);

  const [requestWithProgress] = await addDonorProgress([request]);
  const activities = await DonorRequestActivity.find({
    requestId: request._id,
    respondedAt: { $exists: true },
  })
    .populate({ path: 'donorId', select: 'fullName bloodType' })
    .sort({ respondedAt: -1 })
    .lean();

  return {
    ...requestWithProgress,
    donorResponses: activities
      .filter((activity) => activity.donorId)
      .map((activity) => ({
        donorId: String(activity.donorId._id),
        donorName: activity.donorId.fullName,
        bloodType: activity.donorId.bloodType,
        decision: activity.decision,
        respondedAt: activity.respondedAt,
        ...(activity.confirmedAt ? { confirmedAt: activity.confirmedAt } : {}),
        ...(activity.outcome ? { outcome: activity.outcome } : {}),
        ...(activity.outcomeRecordedAt
          ? { outcomeRecordedAt: activity.outcomeRecordedAt }
          : {}),
      })),
  };
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return undefined;

  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayHasPassed =
    today.getUTCMonth() > birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() &&
      today.getUTCDate() >= birthDate.getUTCDate());
  if (!birthdayHasPassed) age -= 1;
  return age;
}

export async function getHospitalDonorResponseDetail(requestId, donorId, hospitalId) {
  const bloodRequest = await BloodRequest.findOne({ _id: requestId, hospitalId })
    .select('hospitalName internalReference bloodType status')
    .lean();
  if (!bloodRequest) throw new AppError('Blood request not found', 404);

  const [activity, aiResult] = await Promise.all([
    DonorRequestActivity.findOne({
      requestId: bloodRequest._id,
      donorId,
      respondedAt: { $exists: true },
    })
      .populate({
        path: 'donorId',
        select:
          'fullName email phone cityRegion bloodType dateOfBirth gender donationProfile',
      })
      .lean(),
    AIResult.findOne({
      requestId: bloodRequest._id,
      donorId,
      hospitalId,
    })
      .select('status answerSummary reviewFlags completedAt updatedAt')
      .lean(),
  ]);

  if (!activity?.donorId) {
    throw new AppError('Donor response not found for this request', 404);
  }

  const donor = activity.donorId;
  return {
    request: {
      id: String(bloodRequest._id),
      hospitalName: bloodRequest.hospitalName,
      internalReference: bloodRequest.internalReference,
      bloodType: bloodRequest.bloodType,
      status: bloodRequest.status,
    },
    donor: {
      id: String(donor._id),
      fullName: donor.fullName,
      email: donor.email,
      phone: donor.phone,
      cityRegion: donor.cityRegion,
      bloodType: donor.bloodType,
      age: calculateAge(donor.dateOfBirth),
      gender: donor.gender,
      ...(donor.donationProfile?.lastDonationAt
        ? { lastDonationAt: donor.donationProfile.lastDonationAt }
        : {}),
    },
    response: {
      decision: activity.decision,
      respondedAt: activity.respondedAt,
      ...(activity.confirmedAt ? { confirmedAt: activity.confirmedAt } : {}),
      ...(activity.outcome ? { outcome: activity.outcome } : {}),
      ...(activity.outcomeRecordedAt
        ? { outcomeRecordedAt: activity.outcomeRecordedAt }
        : {}),
    },
    eligibilityScreening: aiResult
      ? {
          status: aiResult.status,
          answerSummary: aiResult.answerSummary ?? '',
          reviewFlags: aiResult.reviewFlags ?? [],
          ...(aiResult.completedAt ? { completedAt: aiResult.completedAt } : {}),
          updatedAt: aiResult.updatedAt,
        }
      : null,
  };
}

export async function findHospitalRequestDonorMatches(requestId, hospitalId) {
  const bloodRequest = await BloodRequest.findOne({ _id: requestId, hospitalId }).lean();
  if (!bloodRequest) throw new AppError('Blood request not found', 404);
  const compatibleBloodTypes = COMPATIBLE_DONOR_BLOOD_TYPES[bloodRequest.bloodType];
  const radiusKm = DONOR_SEARCH_RADIUS_KM[bloodRequest.urgency];

  if (!compatibleBloodTypes || !radiusKm) {
    throw new AppError('The request does not contain valid donor matching criteria', 400);
  }

  const candidateDonors = await User.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [...bloodRequest.facilityLocation.coordinates],
        },
        distanceField: 'distanceMeters',
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: {
          role: 'donor',
          bloodType: { $in: compatibleBloodTypes },
          location: { $exists: true },
        },
      },
    },
    {
      $project: {
        _id: 1,
        bloodType: 1,
        distanceMeters: 1,
        donationProfile: 1,
        location: 1,
      },
    },
    { $limit: 150 },
  ]);

  const donorIds = candidateDonors.map((donor) => donor._id);
  const historyRows =
    donorIds.length === 0
      ? []
      : await DonorRequestActivity.aggregate([
          { $match: { donorId: { $in: donorIds } } },
          {
            $group: {
              _id: '$donorId',
              notifiedCount: { $sum: 1 },
              acceptedCount: {
                $sum: { $cond: [{ $eq: ['$decision', 'accepted'] }, 1, 0] },
              },
              completedCount: {
                $sum: { $cond: [{ $eq: ['$outcome', 'completed'] }, 1, 0] },
              },
              noShowCount: {
                $sum: { $cond: [{ $eq: ['$outcome', 'no_show'] }, 1, 0] },
              },
              lastCompletedDonationAt: {
                $max: {
                  $cond: [
                    { $eq: ['$outcome', 'completed'] },
                    '$outcomeRecordedAt',
                    null,
                  ],
                },
              },
            },
          },
        ]);
  const historyByDonor = new Map(historyRows.map((row) => [String(row._id), row]));
  const { rankedDonors, excluded } = rankDonorCandidates({
    bloodRequest: {
      bloodType: bloodRequest.bloodType,
      urgency: bloodRequest.urgency,
      radiusKm,
    },
    candidates: candidateDonors.map((donor) => ({
      _id: donor._id,
      bloodType: donor.bloodType,
      coordinates: [...donor.location.coordinates],
      capturedAt: donor.location.capturedAt,
      distanceKm: donor.distanceMeters / 1000,
      donationProfile: donor.donationProfile,
      history: historyByDonor.get(String(donor._id)),
    })),
    minimumIntervalDays: env.donationMinimumIntervalDays,
    averageTravelSpeedKmh: env.matchingAverageTravelSpeedKmh,
    timeZone: env.matchingTimeZone,
  });

  if (rankedDonors.length > 0) {
    const notifiedAt = new Date();
    await DonorRequestActivity.bulkWrite(
      rankedDonors.map((donor) => ({
        updateOne: {
          filter: { requestId: bloodRequest._id, donorId: donor._id },
          update: {
            $set: {
              matchRank: donor.rank,
              matchPercentage: donor.matchPercentage,
              matchingModelVersion: MATCHING_MODEL_VERSION,
              matchingFeatures: donor.features,
              matchingReasons: donor.reasons,
              matchedAt: notifiedAt,
            },
            $setOnInsert: {
              hospitalId: bloodRequest.hospitalId,
              notifiedAt,
            },
          },
          upsert: true,
        },
      })),
    );

    void dispatchMatchNotifications(
      bloodRequest,
      rankedDonors.map((donor) => donor._id),
    ).catch((error) => {
      console.error('Matched donor notification delivery failed', error);
    });
    void dispatchRequestEvent({
      bloodRequest,
      type: 'donor_matching_complete',
      recipients: [{ id: bloodRequest.hospitalId, role: 'hospital' }],
    }).catch((error) => {
      console.error('Hospital matching notification delivery failed', error);
    });
  }

  return {
    requestId: String(bloodRequest._id),
    radiusKm,
    modelVersion: MATCHING_MODEL_VERSION,
    candidateCount: candidateDonors.length,
    excluded,
    hospital: {
      coordinates: [...bloodRequest.facilityLocation.coordinates],
    },
    donors: rankedDonors.map((donor) => ({
      id: `match-${donor.rank}`,
      rank: donor.rank,
      bloodType: donor.bloodType,
      coordinates: donor.coordinates,
      distanceKm: Number(donor.distanceKm.toFixed(1)),
      estimatedTravelMinutes: donor.estimatedTravelMinutes,
      matchPercentage: donor.matchPercentage,
      reasons: donor.reasons,
      eligibility: donor.eligibility,
      capturedAt: donor.capturedAt,
    })),
  };
}

export async function listBloodRequests(donorId) {
  const notifications = await DonorRequestActivity.find({ donorId })
    .select('requestId')
    .sort({ notifiedAt: -1 })
    .limit(100)
    .lean();
  const requestIds = notifications.map((notification) => notification.requestId);

  if (requestIds.length === 0) return [];

  return BloodRequest.find({ _id: { $in: requestIds }, status: 'active' })
    .sort({ urgency: 1, neededBy: 1, createdAt: -1 })
    .limit(100)
    .lean();
}

export async function listDonorActivity(donorId) {
  const activities = await DonorRequestActivity.find({
    donorId,
    respondedAt: { $exists: true },
  })
    .populate({
      path: 'requestId',
      select:
        'hospitalName bloodType unitsNeeded internalReference ward urgency status city address ' +
        'facilityLocation rewardAmount rewardCurrency neededBy createdAt updatedAt',
    })
    .sort({ respondedAt: -1 })
    .limit(100)
    .lean();

  return activities
    .filter((activity) => activity.requestId)
    .map((activity) => ({
      id: String(activity._id),
      request: activity.requestId,
      decision: activity.decision,
      respondedAt: activity.respondedAt,
      ...(activity.confirmedAt ? { confirmedAt: activity.confirmedAt } : {}),
      ...(activity.outcome ? { outcome: activity.outcome } : {}),
      ...(activity.outcomeRecordedAt
        ? { outcomeRecordedAt: activity.outcomeRecordedAt }
        : {}),
    }));
}

export async function recordDonorResponse(requestId, donorId, decision) {
  if (!['accepted', 'declined'].includes(decision)) {
    throw new AppError('Decision must be accepted or declined', 400);
  }

  const bloodRequest = await BloodRequest.findOne({ _id: requestId, status: 'active' })
    .select('_id hospitalId hospitalName bloodType')
    .lean();
  if (!bloodRequest) throw new AppError('Active blood request not found', 404);

  const activity = await DonorRequestActivity.findOne({ requestId, donorId });
  if (!activity) throw new AppError('This donor was not notified about the request', 403);
  if (activity.outcome) {
    throw new AppError('This response is locked because its donation outcome was recorded', 409);
  }

  activity.decision = decision;
  activity.respondedAt = new Date();
  if (decision === 'declined') activity.confirmedAt = undefined;
  await activity.save();

  const responseSummary = await DonorRequestActivity.aggregate([
    { $match: { requestId: bloodRequest._id } },
    {
      $group: {
        _id: null,
        rankedDonors: { $sum: 1 },
        accepted: { $sum: { $cond: [{ $eq: ['$decision', 'accepted'] }, 1, 0] } },
        declined: { $sum: { $cond: [{ $eq: ['$decision', 'declined'] }, 1, 0] } },
      },
    },
  ]);
  const summary = responseSummary[0] ?? { rankedDonors: 0, accepted: 0, declined: 0 };
  const pending = Math.max(0, summary.rankedDonors - summary.accepted - summary.declined);
  void dispatchRequestEvent({
    bloodRequest,
    type: 'donor_response_summary',
    notificationContent: {
      title: 'Donor responses updated',
      body: `${summary.accepted} accepted, ${summary.declined} declined, ${pending} pending of ${summary.rankedDonors} ranked donor(s).`,
    },
    recipients: [{ id: bloodRequest.hospitalId, role: 'hospital' }],
  }).catch((error) => {
    console.error('Hospital donor response notification delivery failed', error);
  });

  return {
    requestId: String(requestId),
    decision: activity.decision,
    respondedAt: activity.respondedAt,
    ...(activity.confirmedAt ? { confirmedAt: activity.confirmedAt } : {}),
  };
}

export async function confirmDonorResponse(requestId, donorId, hospitalId) {
  const bloodRequest = await BloodRequest.findOne({ _id: requestId, hospitalId, status: 'active' })
    .select('_id hospitalName bloodType')
    .lean();
  if (!bloodRequest) throw new AppError('Active blood request not found', 404);

  const activity = await DonorRequestActivity.findOne({ requestId, donorId });
  if (!activity || activity.decision !== 'accepted') {
    throw new AppError('Only donors who accepted this request can be confirmed', 400);
  }

  if (!activity.confirmedAt) {
    activity.confirmedAt = new Date();
    await activity.save();
    void dispatchRequestEvent({
      bloodRequest: {
        ...bloodRequest,
        hospitalName: bloodRequest.hospitalName,
        bloodType: bloodRequest.bloodType,
      },
      type: 'donor_confirmed',
      recipients: [{ id: donorId, role: 'donor' }],
    }).catch((error) => {
      console.error('Donor confirmation notification delivery failed', error);
    });
  }

  return getHospitalBloodRequest(requestId, hospitalId);
}

export async function recordDonorOutcome(requestId, donorId, hospitalId, outcome) {
  if (!['completed', 'no_show'].includes(outcome)) {
    throw new AppError('Outcome must be completed or no_show', 400);
  }

  const bloodRequest = await BloodRequest.findOne({ _id: requestId, hospitalId })
    .select('_id hospitalName bloodType')
    .lean();
  if (!bloodRequest) throw new AppError('Blood request not found', 404);

  const activity = await DonorRequestActivity.findOne({ requestId, donorId });
  if (!activity || activity.decision !== 'accepted' || !activity.confirmedAt) {
    throw new AppError('Confirm the accepted donor before recording an outcome', 400);
  }
  if (activity.outcome) {
    throw new AppError('A donation outcome has already been recorded', 409);
  }

  const outcomeRecordedAt = new Date();
  activity.outcome = outcome;
  activity.outcomeRecordedAt = outcomeRecordedAt;
  await activity.save();

  void dispatchRequestEvent({
    bloodRequest,
    type: outcome === 'completed' ? 'donation_completed' : 'donation_no_show',
    recipients: [{ id: donorId, role: 'donor' }],
  }).catch((error) => {
    console.error('Donor outcome notification delivery failed', error);
  });

  if (outcome === 'completed') {
    await User.updateOne(
      { _id: donorId },
      { $max: { 'donationProfile.lastDonationAt': outcomeRecordedAt } },
    );
  }

  return getHospitalBloodRequest(requestId, hospitalId);
}
