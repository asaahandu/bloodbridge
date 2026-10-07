import assert from 'node:assert/strict';
import test from 'node:test';

import { BloodRequest } from '../src/models/blood-request.model.js';
import { DonorRequestActivity } from '../src/models/donor-request-activity.model.js';
import { User } from '../src/models/user.model.js';
import { getAdminDashboard } from '../src/services/admin-dashboard.service.js';

test('builds the admin dashboard from database aggregates', async () => {
  const originals = {
    userCountDocuments: User.countDocuments,
    requestCountDocuments: BloodRequest.countDocuments,
    requestFind: BloodRequest.find,
    activityAggregate: DonorRequestActivity.aggregate,
    activityCountDocuments: DonorRequestActivity.countDocuments,
  };
  const now = new Date('2026-10-07T12:00:00.000Z');

  User.countDocuments = async (query) => {
    if (query.role === 'donor') return 128;
    if (query.hospitalVerificationStatus === 'verified') return 7;
    if (query.hospitalVerificationStatus === 'pending') return 2;
    return 11;
  };
  BloodRequest.countDocuments = async (query) => query.urgency === 'critical' ? 3 : 9;
  BloodRequest.find = () => ({
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    async lean() {
      return [
        {
          _id: 'standard-request',
          hospitalName: 'Community Hospital',
          city: 'Douala',
          bloodType: 'A+',
          unitsNeeded: 2,
          urgency: 'standard',
          createdAt: new Date('2026-10-07T10:00:00.000Z'),
          neededBy: new Date('2026-10-08T10:00:00.000Z'),
        },
        {
          _id: 'critical-request',
          hospitalName: 'General Hospital',
          city: 'Yaoundé',
          bloodType: 'O-',
          unitsNeeded: 5,
          urgency: 'critical',
          createdAt: new Date('2026-10-06T10:00:00.000Z'),
          neededBy: new Date('2026-10-07T18:00:00.000Z'),
        },
      ];
    },
  });
  DonorRequestActivity.aggregate = async (pipeline) => {
    if (pipeline[0].$facet) {
      return [{
        notifications: [
          { _id: '2026-09-24', notified: 4 },
          { _id: '2026-10-01', notified: 4 },
        ],
        responses: [
          { _id: '2026-09-15', responded: 1, accepted: 1, declined: 0 },
          { _id: '2026-09-24', responded: 2, accepted: 1, declined: 1 },
          { _id: '2026-10-01', responded: 3, accepted: 2, declined: 1 },
        ],
      }];
    }

    return [
      { _id: 'critical-request', notified: 14, responded: 6, confirmed: 2 },
      { _id: 'standard-request', notified: 8, responded: 4, confirmed: 1 },
    ];
  };
  DonorRequestActivity.countDocuments = async () => 4;

  try {
    const dashboard = await getAdminDashboard(now);

    assert.deepEqual(dashboard.metrics, {
      donors: { total: 128 },
      hospitals: { total: 11, verified: 7, pending: 2 },
      activeRequests: { total: 9, critical: 3 },
    });
    assert.equal(dashboard.donorResponses.total, 5);
    assert.equal(dashboard.donorResponses.notified, 8);
    assert.equal(dashboard.donorResponses.accepted, 3);
    assert.equal(dashboard.donorResponses.declined, 2);
    assert.equal(dashboard.donorResponses.responseRate, 62.5);
    assert.equal(dashboard.donorResponses.acceptanceRate, 60);
    assert.equal(dashboard.donorResponses.changePercent, 400);
    assert.equal(dashboard.donorResponses.series.length, 14);
    assert.equal(dashboard.activeRequests[0].id, 'critical-request');
    assert.deepEqual(dashboard.activeRequests[0].donorProgress, {
      notified: 14,
      responded: 6,
      confirmed: 2,
    });
    assert.deepEqual(
      dashboard.alerts.map((alert) => alert.type),
      ['critical_requests', 'pending_verifications', 'delivery_failures'],
    );
  } finally {
    User.countDocuments = originals.userCountDocuments;
    BloodRequest.countDocuments = originals.requestCountDocuments;
    BloodRequest.find = originals.requestFind;
    DonorRequestActivity.aggregate = originals.activityAggregate;
    DonorRequestActivity.countDocuments = originals.activityCountDocuments;
  }
});
