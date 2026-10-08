import mongoose from 'mongoose';

import { BloodRequest } from '../models/blood-request.model.js';
import { Campaign } from '../models/campaign.model.js';
import { DonorRequestActivity } from '../models/donor-request-activity.model.js';
import { KycRequest } from '../models/kyc-request.model.js';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { env } from '../config/env.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const ADMIN_LIST_PAGE_SIZE = 25;
const URGENCY_ORDER = { critical: 0, urgent: 1, standard: 2 };
const ADMIN_USERS_PAGE_SIZE = 50;

export async function getAdminUsers(page = 1) {
  const [total, donors, hospitals] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'donor' }),
    User.countDocuments({ role: 'hospital' }),
  ]);
  const resolvedPage = Math.min(page, Math.max(1, Math.ceil(total / ADMIN_USERS_PAGE_SIZE)));
  const users = await User.find({})
    .select('fullName email phone role cityRegion bloodType hospitalVerificationStatus createdAt')
    .sort({ createdAt: -1, _id: -1 })
    .skip((resolvedPage - 1) * ADMIN_USERS_PAGE_SIZE)
    .limit(ADMIN_USERS_PAGE_SIZE)
    .lean();

  return {
    users: users.map((user) => ({
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      cityRegion: user.cityRegion,
      ...(user.bloodType ? { bloodType: user.bloodType } : {}),
      ...(user.role === 'hospital'
        ? { hospitalVerificationStatus: user.hospitalVerificationStatus ?? 'unverified' }
        : {}),
      createdAt: user.createdAt.toISOString(),
    })),
    total,
    donors,
    hospitals,
    page: resolvedPage,
    pageSize: ADMIN_USERS_PAGE_SIZE,
  };
}

export async function getAdminBloodRequests(page = 1) {
  const [total, active, fulfilled, cancelled, critical] = await Promise.all([
    BloodRequest.countDocuments({}),
    BloodRequest.countDocuments({ status: 'active' }),
    BloodRequest.countDocuments({ status: 'fulfilled' }),
    BloodRequest.countDocuments({ status: 'cancelled' }),
    BloodRequest.countDocuments({ status: 'active', urgency: 'critical' }),
  ]);
  const resolvedPage = Math.min(page, Math.max(1, Math.ceil(total / ADMIN_LIST_PAGE_SIZE)));
  const requests = await BloodRequest.find({})
    .select('hospitalName hospitalId city bloodType unitsNeeded internalReference ward urgency status rewardAmount rewardCurrency createdAt neededBy')
    .populate({ path: 'hospitalId', select: 'hospitalVerificationStatus' })
    .sort({ createdAt: -1, _id: -1 })
    .skip((resolvedPage - 1) * ADMIN_LIST_PAGE_SIZE)
    .limit(ADMIN_LIST_PAGE_SIZE)
    .lean();
  const requestIds = requests.map((request) => request._id);
  const progressRows = requestIds.length === 0
    ? []
    : await DonorRequestActivity.aggregate([
        { $match: { requestId: { $in: requestIds } } },
        {
          $group: {
            _id: '$requestId',
            notified: { $sum: 1 },
            responded: { $sum: { $cond: [{ $ne: ['$respondedAt', null] }, 1, 0] } },
            confirmed: { $sum: { $cond: [{ $ne: ['$confirmedAt', null] }, 1, 0] } },
          },
        },
      ]);
  const progressByRequest = new Map(
    progressRows.map((progress) => [String(progress._id), progress]),
  );

  return {
    requests: requests.map((request) => {
      const progress = progressByRequest.get(String(request._id));
      return {
        id: String(request._id),
        hospitalName: request.hospitalName,
        hospitalVerificationStatus:
          request.hospitalId?.hospitalVerificationStatus ?? 'unverified',
        city: request.city,
        bloodType: request.bloodType,
        unitsNeeded: request.unitsNeeded,
        internalReference: request.internalReference,
        ...(request.ward ? { ward: request.ward } : {}),
        urgency: request.urgency,
        status: request.status,
        ...(request.rewardAmount == null
          ? {}
          : { rewardAmount: request.rewardAmount, rewardCurrency: request.rewardCurrency }),
        createdAt: request.createdAt.toISOString(),
        neededBy: request.neededBy.toISOString(),
        donorProgress: {
          notified: progress?.notified ?? 0,
          responded: progress?.responded ?? 0,
          confirmed: progress?.confirmed ?? 0,
        },
      };
    }),
    total,
    active,
    fulfilled,
    cancelled,
    critical,
    page: resolvedPage,
    pageSize: ADMIN_LIST_PAGE_SIZE,
  };
}

export async function getAdminCampaigns(page = 1, now = new Date()) {
  const [total, upcoming, past] = await Promise.all([
    Campaign.countDocuments({}),
    Campaign.countDocuments({ date: { $gte: now } }),
    Campaign.countDocuments({ date: { $lt: now } }),
  ]);
  const resolvedPage = Math.min(page, Math.max(1, Math.ceil(total / ADMIN_LIST_PAGE_SIZE)));
  const campaigns = await Campaign.find({})
    .select('hospitalName hospitalId title date location description images.name images.mimeType images.size createdAt')
    .populate({ path: 'hospitalId', select: 'hospitalVerificationStatus' })
    .sort({ date: 1, createdAt: -1, _id: -1 })
    .skip((resolvedPage - 1) * ADMIN_LIST_PAGE_SIZE)
    .limit(ADMIN_LIST_PAGE_SIZE)
    .lean();

  return {
    campaigns: campaigns.map((campaign) => ({
      id: String(campaign._id),
      hospitalName: campaign.hospitalName,
      hospitalVerificationStatus:
        campaign.hospitalId?.hospitalVerificationStatus ?? 'unverified',
      title: campaign.title,
      date: campaign.date.toISOString(),
      upcoming: campaign.date >= now,
      location: campaign.location,
      description: campaign.description,
      images: campaign.images.map(({ name, mimeType, size }) => ({ name, mimeType, size })),
      createdAt: campaign.createdAt.toISOString(),
    })),
    total,
    upcoming,
    past,
    page: resolvedPage,
    pageSize: ADMIN_LIST_PAGE_SIZE,
  };
}

export async function getAdminKycRequests(page = 1) {
  const [total, pending, verified, rejected] = await Promise.all([
    KycRequest.countDocuments({}),
    KycRequest.countDocuments({ status: 'pending' }),
    KycRequest.countDocuments({ status: 'verified' }),
    KycRequest.countDocuments({ status: 'rejected' }),
  ]);
  const resolvedPage = Math.min(page, Math.max(1, Math.ceil(total / ADMIN_LIST_PAGE_SIZE)));
  const requests = await KycRequest.find({})
    .select('hospitalName hospitalId status submittedAt documents.name documents.mimeType documents.size')
    .populate({ path: 'hospitalId', select: 'fullName email phone cityRegion hospitalVerificationStatus' })
    .sort({ submittedAt: -1, _id: -1 })
    .skip((resolvedPage - 1) * ADMIN_LIST_PAGE_SIZE)
    .limit(ADMIN_LIST_PAGE_SIZE)
    .lean();

  return {
    requests: requests.map((request) => ({
      id: String(request._id),
      hospitalName: request.hospitalName,
      hospitalVerificationStatus:
        request.hospitalId?.hospitalVerificationStatus ?? 'unverified',
      hospitalEmail: request.hospitalId?.email ?? '',
      hospitalPhone: request.hospitalId?.phone ?? '',
      cityRegion: request.hospitalId?.cityRegion ?? '',
      status: request.status,
      submittedAt: request.submittedAt.toISOString(),
      documents: request.documents.map(({ name, mimeType, size }) => ({ name, mimeType, size })),
    })),
    total,
    pending,
    verified,
    rejected,
    page: resolvedPage,
    pageSize: ADMIN_LIST_PAGE_SIZE,
  };
}

export async function getAdminKycRequest(requestId) {
  if (!mongoose.isValidObjectId(requestId)) {
    throw new AppError('KYC request not found', 404);
  }

  const request = await KycRequest.findById(requestId)
    .select('hospitalName hospitalId status submittedAt documents.name documents.mimeType documents.size')
    .populate({ path: 'hospitalId', select: 'fullName email phone cityRegion hospitalVerificationStatus' })
    .lean();
  if (!request) throw new AppError('KYC request not found', 404);

  return {
    id: String(request._id),
    hospitalName: request.hospitalName,
    hospitalVerificationStatus:
      request.hospitalId?.hospitalVerificationStatus ?? 'unverified',
    hospitalEmail: request.hospitalId?.email ?? '',
    hospitalPhone: request.hospitalId?.phone ?? '',
    cityRegion: request.hospitalId?.cityRegion ?? '',
    status: request.status,
    submittedAt: request.submittedAt.toISOString(),
    documents: request.documents.map(({ name, mimeType, size }, index) => ({
      index,
      name,
      mimeType,
      size,
    })),
  };
}

export async function updateAdminKycRequestStatus(requestId, status) {
  if (!mongoose.isValidObjectId(requestId)) {
    throw new AppError('KYC request not found', 404);
  }
  if (!['verified', 'rejected'].includes(status)) {
    throw new AppError('KYC status must be verified or rejected', 400);
  }

  const request = await KycRequest.findById(requestId).select('hospitalId status').lean();
  if (!request) throw new AppError('KYC request not found', 404);
  if (request.status !== 'pending') {
    throw new AppError('This KYC request has already been reviewed', 409);
  }

  const hospital = await User.findOneAndUpdate(
    {
      _id: request.hospitalId,
      role: 'hospital',
      hospitalVerificationStatus: 'pending',
    },
    { $set: { hospitalVerificationStatus: status } },
    { new: true },
  ).select('_id');
  if (!hospital) {
    throw new AppError('The hospital verification status is no longer pending', 409);
  }

  let updatedRequest;
  try {
    updatedRequest = await KycRequest.findOneAndUpdate(
      { _id: requestId, status: 'pending' },
      { $set: { status } },
      { new: true },
    ).select('_id status');
  } catch (error) {
    const rollback = await User.updateOne(
      { _id: request.hospitalId, role: 'hospital', hospitalVerificationStatus: status },
      { $set: { hospitalVerificationStatus: 'pending' } },
    );
    if (rollback.modifiedCount !== 1) {
      console.error('Unable to roll back hospital verification status after KYC review failure');
      throw new AppError('KYC review failed and the hospital status could not be restored', 500);
    }
    throw error;
  }

  if (!updatedRequest) {
    const rollback = await User.updateOne(
      { _id: request.hospitalId, role: 'hospital', hospitalVerificationStatus: status },
      { $set: { hospitalVerificationStatus: 'pending' } },
    );
    if (rollback.modifiedCount !== 1) {
      console.error('Unable to roll back hospital verification status after a concurrent KYC review');
      throw new AppError('KYC review conflicted and the hospital status could not be restored', 500);
    }
    throw new AppError('This KYC request has already been reviewed', 409);
  }

  return {
    id: String(updatedRequest._id),
    status: updatedRequest.status,
    hospitalVerificationStatus: status,
  };
}

export async function getAdminKycDocument(requestId, documentIndex) {
  if (!mongoose.isValidObjectId(requestId) || !/^\d+$/.test(documentIndex)) {
    throw new AppError('KYC document not found', 404);
  }
  const index = Number(documentIndex);
  if (!Number.isSafeInteger(index)) throw new AppError('KYC document not found', 404);

  const request = await KycRequest.findById(requestId)
    .select('documents.name documents.mimeType documents.size +documents.content');
  const document = request?.documents[index];
  if (!document) throw new AppError('KYC document not found', 404);
  if (!Buffer.isBuffer(document.content) || document.content.length === 0) {
    throw new AppError('KYC document data is unavailable', 404);
  }

  return {
    content: Buffer.from(document.content),
    mimeType: document.mimeType,
  };
}

function formatDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: env.matchingTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDayLabel(date) {
  return new Intl.DateTimeFormat('en', {
    timeZone: env.matchingTimeZone,
    weekday: 'short',
  }).format(date);
}

function percentage(numerator, denominator) {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 1000) / 10;
}

function buildResponseSummary(facetRows, now) {
  const facets = facetRows[0] ?? { notifications: [], responses: [] };
  const notificationsByDate = new Map(
    facets.notifications.map((row) => [row._id, row.notified]),
  );
  const responsesByDate = new Map(facets.responses.map((row) => [row._id, row]));
  const twentyEightDays = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(now.getTime() - (27 - index) * DAY_IN_MS);
    const responseCounts = responsesByDate.get(formatDateKey(date));
    const notified = notificationsByDate.get(formatDateKey(date)) ?? 0;
    const responded = responseCounts?.responded ?? 0;

    return {
      date: formatDateKey(date),
      label: formatDayLabel(date),
      notified,
      total: responded,
      accepted: responseCounts?.accepted ?? 0,
      declined: responseCounts?.declined ?? 0,
      responseRate: percentage(responded, notified),
    };
  });

  const previousSeries = twentyEightDays.slice(0, 14);
  const series = twentyEightDays.slice(14);
  const previousTotal = previousSeries
    .reduce((sum, day) => sum + day.total, 0);
  const total = series.reduce((sum, day) => sum + day.total, 0);
  const notified = series.reduce((sum, day) => sum + day.notified, 0);
  const accepted = series.reduce((sum, day) => sum + day.accepted, 0);
  const declined = series.reduce((sum, day) => sum + day.declined, 0);

  return {
    periodDays: 14,
    notified,
    total,
    accepted,
    declined,
    responseRate: percentage(total, notified),
    acceptanceRate: percentage(accepted, total),
    changePercent:
      previousTotal === 0
        ? null
        : Math.round(((total - previousTotal) / previousTotal) * 1000) / 10,
    series,
  };
}

function buildAlerts({ criticalRequests, pendingHospitals, deliveryFailures }) {
  const alerts = [];

  if (criticalRequests > 0) {
    alerts.push({
      type: 'critical_requests',
      tone: 'danger',
      title: `${criticalRequests} critical blood ${criticalRequests === 1 ? 'request needs' : 'requests need'} attention`,
      description: 'Critical requests are still active in the hospital network.',
    });
  }

  if (pendingHospitals > 0) {
    alerts.push({
      type: 'pending_verifications',
      tone: 'warning',
      title: `${pendingHospitals} hospital ${pendingHospitals === 1 ? 'verification is' : 'verifications are'} pending`,
      description: 'Review submitted hospital credentials before enabling verified access.',
    });
  }

  if (deliveryFailures > 0) {
    alerts.push({
      type: 'delivery_failures',
      tone: 'warning',
      title: `${deliveryFailures} notification ${deliveryFailures === 1 ? 'delivery needs' : 'deliveries need'} review`,
      description: 'Push, email, or WhatsApp delivery failed during the last 24 hours.',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'healthy',
      tone: 'success',
      title: 'No urgent operational alerts',
      description: 'There are no critical requests, pending verifications, or recent delivery failures.',
    });
  }

  return alerts;
}

export async function getAdminDashboard(now = new Date()) {
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * DAY_IN_MS);
  const oneDayAgo = new Date(now.getTime() - DAY_IN_MS);

  const [
    donorCount,
    hospitalCount,
    verifiedHospitalCount,
    pendingHospitalCount,
    activeRequestCount,
    criticalRequestCount,
    recentRequests,
    responseRows,
    deliveryFailureCount,
  ] = await Promise.all([
    User.countDocuments({ role: 'donor' }),
    User.countDocuments({ role: 'hospital' }),
    User.countDocuments({ role: 'hospital', hospitalVerificationStatus: 'verified' }),
    User.countDocuments({ role: 'hospital', hospitalVerificationStatus: 'pending' }),
    BloodRequest.countDocuments({ status: 'active' }),
    BloodRequest.countDocuments({ status: 'active', urgency: 'critical' }),
    BloodRequest.find({ status: 'active' })
      .select('hospitalName hospitalId city bloodType unitsNeeded urgency createdAt neededBy')
      .populate({ path: 'hospitalId', select: 'hospitalVerificationStatus' })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean(),
    DonorRequestActivity.aggregate([
      {
        $facet: {
          notifications: [
            { $match: { notifiedAt: { $gte: twentyEightDaysAgo, $lte: now } } },
            {
              $group: {
                _id: {
                  $dateToString: {
                    date: '$notifiedAt',
                    format: '%Y-%m-%d',
                    timezone: env.matchingTimeZone,
                  },
                },
                notified: { $sum: 1 },
              },
            },
          ],
          responses: [
            { $match: { respondedAt: { $gte: twentyEightDaysAgo, $lte: now } } },
            {
              $group: {
                _id: {
                  $dateToString: {
                    date: '$respondedAt',
                    format: '%Y-%m-%d',
                    timezone: env.matchingTimeZone,
                  },
                },
                responded: { $sum: 1 },
                accepted: { $sum: { $cond: [{ $eq: ['$decision', 'accepted'] }, 1, 0] } },
                declined: { $sum: { $cond: [{ $eq: ['$decision', 'declined'] }, 1, 0] } },
              },
            },
          ],
        },
      },
    ]),
    DonorRequestActivity.countDocuments({
      updatedAt: { $gte: oneDayAgo },
      $or: [
        { pushStatus: 'failed' },
        { emailStatus: 'failed' },
        { whatsappStatus: 'failed' },
      ],
    }),
  ]);

  const requestIds = recentRequests.map((request) => request._id);
  const progressRows = requestIds.length === 0
    ? []
    : await DonorRequestActivity.aggregate([
        { $match: { requestId: { $in: requestIds } } },
        {
          $group: {
            _id: '$requestId',
            notified: { $sum: 1 },
            responded: { $sum: { $cond: [{ $ne: ['$respondedAt', null] }, 1, 0] } },
            confirmed: { $sum: { $cond: [{ $ne: ['$confirmedAt', null] }, 1, 0] } },
          },
        },
      ]);
  const progressByRequest = new Map(
    progressRows.map((progress) => [String(progress._id), progress]),
  );

  const activeRequests = recentRequests
    .map((request) => {
      const progress = progressByRequest.get(String(request._id));
      return {
        id: String(request._id),
        hospitalName: request.hospitalName,
        hospitalVerificationStatus:
          request.hospitalId?.hospitalVerificationStatus ?? 'unverified',
        city: request.city,
        bloodType: request.bloodType,
        unitsNeeded: request.unitsNeeded,
        urgency: request.urgency,
        createdAt: request.createdAt,
        neededBy: request.neededBy,
        donorProgress: {
          notified: progress?.notified ?? 0,
          responded: progress?.responded ?? 0,
          confirmed: progress?.confirmed ?? 0,
        },
      };
    })
    .sort((first, second) => {
      const urgencyDifference = URGENCY_ORDER[first.urgency] - URGENCY_ORDER[second.urgency];
      return urgencyDifference || new Date(second.createdAt) - new Date(first.createdAt);
    })
    .slice(0, 8);

  return {
    generatedAt: now,
    metrics: {
      donors: { total: donorCount },
      hospitals: {
        total: hospitalCount,
        verified: verifiedHospitalCount,
        pending: pendingHospitalCount,
      },
      activeRequests: {
        total: activeRequestCount,
        critical: criticalRequestCount,
      },
    },
    donorResponses: buildResponseSummary(responseRows, now),
    activeRequests,
    alerts: buildAlerts({
      criticalRequests: criticalRequestCount,
      pendingHospitals: pendingHospitalCount,
      deliveryFailures: deliveryFailureCount,
    }),
  };
}
