import assert from 'node:assert/strict';
import test from 'node:test';

import { BloodRequest } from '../src/models/blood-request.model.js';
import { DonorRequestActivity } from '../src/models/donor-request-activity.model.js';
import { User } from '../src/models/user.model.js';
import {
    createBloodRequest,
    findHospitalRequestDonorMatches,
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
    assert.ok(donorSearchPipeline[0].$geoNear.maxDistance > 0);
  } finally {
    BloodRequest.create = originalCreate;
    BloodRequest.findOne = originalFindOne;
    User.aggregate = originalUserAggregate;
    DonorRequestActivity.aggregate = originalActivityAggregate;
  }
});