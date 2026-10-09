import assert from 'node:assert/strict';
import test from 'node:test';

import { BloodRequest } from '../src/models/blood-request.model.js';
import { DonorRequestActivity } from '../src/models/donor-request-activity.model.js';
import { User } from '../src/models/user.model.js';
import {
    cancelHospitalBloodRequest,
    createBloodRequest,
    findHospitalRequestDonorMatches,
    updateHospitalBloodRequest,
} from '../src/services/blood-request.service.js';

test('submits a blood request and searches for compatible donors', async () => {
  const originalCreate = BloodRequest.create;
  const originalFindOne = BloodRequest.findOne;
  const originalUserAggregate = User.aggregate;
  const originalActivityAggregate = DonorRequestActivity.aggregate;
  const hospital = {
    _id: 'hospital-1',
    fullName: 'Community Hospital',
    cityRegion: 'Douala',
    location: { coordinates: [9.7, 4.05], accuracy: 20 },
  };
  const requestDetails = {
    bloodType: 'A+',
    unitsNeeded: 2,
    urgency: 'urgent',
    internalReference: 'WARD-12',
    ward: 'Emergency department',
    rewardAmount: 25000,
    neededBy: new Date('2026-11-01T12:00:00.000Z'),
  };
  let persistedRequest;
  let donorSearchPipeline;

  BloodRequest.create = async (document) => {
    persistedRequest = { ...document, _id: 'request-1', status: 'active' };
    return persistedRequest;
  };
  BloodRequest.findOne = () => ({ lean: async () => persistedRequest });
  User.aggregate = async (pipeline) => {
    donorSearchPipeline = pipeline;
    return [];
  };
  DonorRequestActivity.aggregate = async () => [];

  try {
    const submittedRequest = await createBloodRequest(requestDetails, hospital);
    console.log('Submitted blood request:\n', JSON.stringify(submittedRequest, null, 2));

    assert.deepEqual(submittedRequest, {
      _id: 'request-1',
      status: 'active',
      hospitalId: 'hospital-1',
      hospitalName: 'Community Hospital',
      city: 'Douala',
      facilityLocation: {
        type: 'Point',
        coordinates: [9.7, 4.05],
        accuracy: 20,
      },
      ...requestDetails,
      rewardCurrency: 'XAF',
    });

    const search = await findHospitalRequestDonorMatches(
      submittedRequest._id,
      hospital._id,
    );

    assert.equal(search.requestId, 'request-1');
    assert.equal(search.candidateCount, 0);
    assert.equal(donorSearchPipeline[0].$geoNear.query.role, 'donor');
    assert.deepEqual(donorSearchPipeline[0].$geoNear.query.accountStatus, { $ne: 'suspended' });
    assert.ok(donorSearchPipeline[0].$geoNear.maxDistance > 0);
  } finally {
    BloodRequest.create = originalCreate;
    BloodRequest.findOne = originalFindOne;
    User.aggregate = originalUserAggregate;
    DonorRequestActivity.aggregate = originalActivityAggregate;
  }
});

test('updates an active hospital request and clears optional fields', async () => {
  const originalFindOne = BloodRequest.findOne;
  const originalExists = DonorRequestActivity.exists;
  const submittedAt = Date.now();
  const request = {
    status: 'active',
    bloodType: 'A+',
    unitsNeeded: 2,
    urgency: 'urgent',
    internalReference: 'WARD-12',
    ward: 'Emergency',
    rewardAmount: 25000,
    rewardCurrency: 'XAF',
    async save() {
      this.saved = true;
    },
  };
  BloodRequest.findOne = async () => request;
  DonorRequestActivity.exists = async () => false;

  try {
    const updated = await updateHospitalBloodRequest('request-1', 'hospital-1', {
      bloodType: 'O-',
      unitsNeeded: 3,
      urgency: 'critical',
      internalReference: 'WARD-14',
      ward: '',
      rewardAmount: null,
    });

    assert.equal(updated, request);
    assert.equal(request.bloodType, 'O-');
    assert.equal(request.unitsNeeded, 3);
    assert.equal(request.urgency, 'critical');
    assert.ok(request.neededBy.getTime() >= submittedAt + 2 * 60 * 60 * 1000);
    assert.ok(request.neededBy.getTime() <= Date.now() + 2 * 60 * 60 * 1000);
    assert.equal(request.internalReference, 'WARD-14');
    assert.equal(request.ward, undefined);
    assert.equal(request.rewardAmount, undefined);
    assert.equal(request.rewardCurrency, undefined);
    assert.equal(request.saved, true);
  } finally {
    BloodRequest.findOne = originalFindOne;
    DonorRequestActivity.exists = originalExists;
  }
});

test('rejects invalid edits and does not save the active request', async () => {
  const originalFindOne = BloodRequest.findOne;
  const request = {
    status: 'active',
    async save() {
      assert.fail('Invalid update must not be saved');
    },
  };
  BloodRequest.findOne = async () => request;

  try {
    await assert.rejects(
      updateHospitalBloodRequest('request-1', 'hospital-1', { unitsNeeded: 21 }),
      { statusCode: 400 },
    );
  } finally {
    BloodRequest.findOne = originalFindOne;
  }
});

test('prevents changing donor matching criteria after a donor has been notified', async () => {
  const originalFindOne = BloodRequest.findOne;
  const originalExists = DonorRequestActivity.exists;
  const request = {
    status: 'active',
    bloodType: 'A+',
    urgency: 'urgent',
    async save() {
      assert.fail('Matching criteria must not change after notification');
    },
  };
  BloodRequest.findOne = async () => request;
  DonorRequestActivity.exists = async () => true;

  try {
    await assert.rejects(
      updateHospitalBloodRequest('request-1', 'hospital-1', { bloodType: 'O-' }),
      { statusCode: 409 },
    );
  } finally {
    BloodRequest.findOne = originalFindOne;
    DonorRequestActivity.exists = originalExists;
  }
});

test('cancels an active hospital request and rejects repeat cancellation', async () => {
  const originalFindOne = BloodRequest.findOne;
  const request = {
    status: 'active',
    async save() {
      this.saved = true;
    },
  };
  BloodRequest.findOne = async () => request;

  try {
    const cancelled = await cancelHospitalBloodRequest('request-1', 'hospital-1');
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(request.saved, true);

    await assert.rejects(
      cancelHospitalBloodRequest('request-1', 'hospital-1'),
      { statusCode: 409 },
    );
  } finally {
    BloodRequest.findOne = originalFindOne;
  }
});