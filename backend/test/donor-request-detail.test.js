import assert from 'node:assert/strict';
import test from 'node:test';

import { BloodRequest } from '../src/models/blood-request.model.js';
import { DonorRequestActivity } from '../src/models/donor-request-activity.model.js';
import { getDonorBloodRequest } from '../src/services/blood-request.service.js';

test('returns an active request detail only for a notified donor', async () => {
  const originals = {
    requestFindOne: BloodRequest.findOne,
    activityFindOne: DonorRequestActivity.findOne,
  };
  const request = {
    _id: '507f1f77bcf86cd799439011',
    hospitalId: { hospitalVerificationStatus: 'verified' },
    hospitalName: 'Community Hospital',
    bloodType: 'O-',
    unitsNeeded: 2,
    status: 'active',
  };
  let requestQuery;
  let activityQuery;

  BloodRequest.findOne = (query) => {
    requestQuery = query;
    return {
      populate(path) {
        assert.deepEqual(path, { path: 'hospitalId', select: 'hospitalVerificationStatus' });
        return this;
      },
      lean: async () => request,
    };
  };
  DonorRequestActivity.findOne = (query) => {
    activityQuery = query;
    return {
      select(fields) {
        assert.equal(fields, 'decision');
        return this;
      },
      lean: async () => ({ decision: 'accepted' }),
    };
  };

  try {
    const detail = await getDonorBloodRequest(
      '507f1f77bcf86cd799439011',
      'donor-1',
    );

    assert.deepEqual(requestQuery, {
      _id: '507f1f77bcf86cd799439011',
      status: 'active',
    });
    assert.deepEqual(activityQuery, {
      requestId: '507f1f77bcf86cd799439011',
      donorId: 'donor-1',
    });
    assert.deepEqual(detail, {
      request: {
        _id: '507f1f77bcf86cd799439011',
        hospitalName: 'Community Hospital',
        bloodType: 'O-',
        unitsNeeded: 2,
        status: 'active',
        hospitalVerificationStatus: 'verified',
      },
      decision: 'accepted',
    });
  } finally {
    BloodRequest.findOne = originals.requestFindOne;
    DonorRequestActivity.findOne = originals.activityFindOne;
  }
});

test('does not return request details to a donor who was not notified', async () => {
  const originals = {
    requestFindOne: BloodRequest.findOne,
    activityFindOne: DonorRequestActivity.findOne,
  };

  BloodRequest.findOne = () => ({
    populate() {
      return this;
    },
    lean: async () => ({ _id: '507f1f77bcf86cd799439011' }),
  });
  DonorRequestActivity.findOne = () => ({
    select() {
      return this;
    },
    lean: async () => null,
  });

  try {
    await assert.rejects(
      getDonorBloodRequest('507f1f77bcf86cd799439011', 'donor-2'),
      { message: 'Blood request not found', statusCode: 404 },
    );
  } finally {
    BloodRequest.findOne = originals.requestFindOne;
    DonorRequestActivity.findOne = originals.activityFindOne;
  }
});

test('rejects invalid donor request IDs as not found', async () => {
  await assert.rejects(
    getDonorBloodRequest('not-a-request-id', 'donor-3'),
    { message: 'Blood request not found', statusCode: 404 },
  );
});
