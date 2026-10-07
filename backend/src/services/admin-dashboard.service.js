import { BloodRequest } from '../models/blood-request.model.js';
import { DonorRequestActivity } from '../models/donor-request-activity.model.js';
import { User } from '../models/user.model.js';
import { env } from '../config/env.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const URGENCY_ORDER = { critical: 0, urgent: 1, standard: 2 };

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
      .select('hospitalName city bloodType unitsNeeded urgency createdAt neededBy')
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
