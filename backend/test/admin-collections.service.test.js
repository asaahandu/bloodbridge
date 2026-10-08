import assert from 'node:assert/strict';
import test from 'node:test';

import { BloodRequest } from '../src/models/blood-request.model.js';
import { Campaign } from '../src/models/campaign.model.js';
import { DonorRequestActivity } from '../src/models/donor-request-activity.model.js';
import { KycRequest } from '../src/models/kyc-request.model.js';
import { User } from '../src/models/user.model.js';
import {
  getAdminBloodRequests,
  getAdminCampaigns,
  getAdminKycDocument,
  getAdminKycRequest,
  getAdminKycRequests,
  updateAdminKycRequestStatus,
} from '../src/services/admin-dashboard.service.js';

test('returns paginated admin blood requests and donor progress', async () => {
  const originals = {
    countDocuments: BloodRequest.countDocuments,
    find: BloodRequest.find,
    aggregate: DonorRequestActivity.aggregate,
  };
  const queryDetails = {};
  BloodRequest.countDocuments = async (query) => {
    if (query.status === 'active' && query.urgency === 'critical') return 2;
    if (query.status === 'active') return 40;
    if (query.status === 'fulfilled') return 15;
    if (query.status === 'cancelled') return 5;
    return 60;
  };
  BloodRequest.find = () => ({
    select(fields) { queryDetails.fields = fields; return this; },
    populate(options) { queryDetails.populate = options; return this; },
    sort(sort) { queryDetails.sort = sort; return this; },
    skip(skip) { queryDetails.skip = skip; return this; },
    limit(limit) { queryDetails.limit = limit; return this; },
    async lean() {
      return [{
        _id: 'request-26',
        hospitalName: 'Central Hospital',
        hospitalId: { hospitalVerificationStatus: 'verified' },
        city: 'Douala',
        bloodType: 'O+',
        unitsNeeded: 3,
        internalReference: 'WARD-2',
        urgency: 'critical',
        status: 'active',
        createdAt: new Date('2026-10-01T10:00:00.000Z'),
        neededBy: new Date('2026-10-02T10:00:00.000Z'),
      }];
    },
  });
  DonorRequestActivity.aggregate = async () => [
    { _id: 'request-26', notified: 10, responded: 4, confirmed: 2 },
  ];

  try {
    const data = await getAdminBloodRequests(2);
    assert.equal(data.total, 60);
    assert.equal(data.critical, 2);
    assert.equal(data.page, 2);
    assert.equal(data.requests[0].hospitalVerificationStatus, 'verified');
    assert.equal(queryDetails.skip, 25);
    assert.equal(queryDetails.limit, 25);
    assert.deepEqual(data.requests[0].donorProgress, {
      notified: 10,
      responded: 4,
      confirmed: 2,
    });
  } finally {
    BloodRequest.countDocuments = originals.countDocuments;
    BloodRequest.find = originals.find;
    DonorRequestActivity.aggregate = originals.aggregate;
  }
});

test('returns campaign listings without exposing uploaded image contents', async () => {
  const originals = {
    countDocuments: Campaign.countDocuments,
    find: Campaign.find,
  };
  let selectedFields;
  Campaign.countDocuments = async (query) => {
    if (query.date?.$gte) return 3;
    if (query.date?.$lt) return 2;
    return 5;
  };
  Campaign.find = () => ({
    select(fields) { selectedFields = fields; return this; },
    populate() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    async lean() {
      return [{
        _id: 'campaign-1',
        hospitalName: 'Central Hospital',
        hospitalId: { hospitalVerificationStatus: 'verified' },
        title: 'Community drive',
        date: new Date('2026-11-01T00:00:00.000Z'),
        location: 'Central Hall',
        description: 'Donate blood.',
        images: [{ name: 'poster.png', mimeType: 'image/png', size: 8, content: Buffer.from('private') }],
        createdAt: new Date('2026-10-01T10:00:00.000Z'),
      }];
    },
  });

  try {
    const data = await getAdminCampaigns(1, new Date('2026-10-08T00:00:00.000Z'));
    assert.equal(data.total, 5);
    assert.equal(data.upcoming, 3);
    assert.equal(data.past, 2);
    assert.equal(data.campaigns[0].upcoming, true);
    assert.equal(data.campaigns[0].hospitalVerificationStatus, 'verified');
    assert.equal(selectedFields.includes('images.content'), false);
    assert.deepEqual(data.campaigns[0].images, [
      { name: 'poster.png', mimeType: 'image/png', size: 8 },
    ]);
    assert.equal('content' in data.campaigns[0].images[0], false);
  } finally {
    Campaign.countDocuments = originals.countDocuments;
    Campaign.find = originals.find;
  }
});

test('returns KYC request document metadata without exposing document contents', async () => {
  const originals = {
    countDocuments: KycRequest.countDocuments,
    find: KycRequest.find,
  };
  let selectedFields;
  let populateOptions;
  KycRequest.countDocuments = async (query) => {
    if (query.status === 'pending') return 2;
    if (query.status === 'verified') return 1;
    if (query.status === 'rejected') return 1;
    return 4;
  };
  KycRequest.find = () => ({
    select(fields) { selectedFields = fields; return this; },
    populate(options) { populateOptions = options; return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    async lean() {
      return [{
        _id: 'kyc-1',
        hospitalName: 'Central Hospital',
        hospitalId: {
          email: 'admin@central.example',
          phone: '+237600000000',
          cityRegion: 'Douala',
        },
        status: 'pending',
        submittedAt: new Date('2026-10-01T10:00:00.000Z'),
        documents: [{
          name: 'registration.pdf',
          mimeType: 'application/pdf',
          size: 128,
          content: Buffer.from('private'),
        }],
      }];
    },
  });

  try {
    const data = await getAdminKycRequests(1);
    assert.equal(data.total, 4);
    assert.equal(data.pending, 2);
    assert.equal(selectedFields.includes('documents.content'), false);
    assert.equal(populateOptions.select.includes('email'), true);
    assert.equal(data.requests[0].hospitalEmail, 'admin@central.example');
    assert.deepEqual(data.requests[0].documents, [
      { name: 'registration.pdf', mimeType: 'application/pdf', size: 128 },
    ]);
    assert.equal('content' in data.requests[0].documents[0], false);
  } finally {
    KycRequest.countDocuments = originals.countDocuments;
    KycRequest.find = originals.find;
  }
});

test('returns KYC submission information without document bytes', async () => {
  const originalFindById = KycRequest.findById;
  let selectedFields;
  let populatedFields;
  KycRequest.findById = () => ({
    select(fields) { selectedFields = fields; return this; },
    populate(options) { populatedFields = options.select; return this; },
    async lean() {
      return {
        _id: '507f1f77bcf86cd799439011',
        hospitalName: 'Central Hospital',
        hospitalId: {
          email: 'admin@central.example',
          phone: '+237600000000',
          cityRegion: 'Douala',
        },
        status: 'pending',
        submittedAt: new Date('2026-10-01T10:00:00.000Z'),
        documents: [{ name: 'registration.pdf', mimeType: 'application/pdf', size: 128 }],
      };
    },
  });

  try {
    const details = await getAdminKycRequest('507f1f77bcf86cd799439011');
    assert.equal(details.hospitalName, 'Central Hospital');
    assert.equal(details.hospitalEmail, 'admin@central.example');
    assert.deepEqual(details.documents, [{
      index: 0,
      name: 'registration.pdf',
      mimeType: 'application/pdf',
      size: 128,
    }]);
    assert.equal(selectedFields.includes('documents.content'), false);
    assert.equal(populatedFields.includes('email'), true);
    await assert.rejects(getAdminKycRequest('invalid-id'), { statusCode: 404 });
  } finally {
    KycRequest.findById = originalFindById;
  }
});

test('loads one KYC document only after validating its request and index', async () => {
  const originalFindById = KycRequest.findById;
  let selectedFields;
  KycRequest.findById = () => ({
    select(fields) {
      selectedFields = fields;
      return Promise.resolve({
        documents: [{
          content: Buffer.from('%PDF-document'),
          mimeType: 'application/pdf',
        }],
      });
    },
  });

  try {
    const document = await getAdminKycDocument('507f1f77bcf86cd799439011', '0');
    assert.equal(document.mimeType, 'application/pdf');
    assert.deepEqual(document.content, Buffer.from('%PDF-document'));
    assert.equal(selectedFields.includes('+documents.content'), true);
    await assert.rejects(
      getAdminKycDocument('507f1f77bcf86cd799439011', 'invalid'),
      { statusCode: 404 },
    );
    await assert.rejects(
      getAdminKycDocument('invalid-id', '0'),
      { statusCode: 404 },
    );
  } finally {
    KycRequest.findById = originalFindById;
  }
});

test('updates both KYC request and hospital status when reviewing a pending submission', async () => {
  const originals = {
    kycFindById: KycRequest.findById,
    kycFindOneAndUpdate: KycRequest.findOneAndUpdate,
    userFindOneAndUpdate: User.findOneAndUpdate,
  };
  const kycStatuses = [];
  const hospitalStatuses = [];
  KycRequest.findById = () => ({
    select() {
      return {
        lean: async () => ({
          hospitalId: '507f1f77bcf86cd799439012',
          status: 'pending',
        }),
      };
    },
  });
  KycRequest.findOneAndUpdate = (query, update) => ({
    select() {
      const status = update.$set.status;
      kycStatuses.push({ query, status });
      return Promise.resolve({ _id: query._id, status });
    },
  });
  User.findOneAndUpdate = (query, update) => ({
    select() {
      const status = update.$set.hospitalVerificationStatus;
      hospitalStatuses.push({ query, status });
      return Promise.resolve({ _id: query._id });
    },
  });

  try {
    const approved = await updateAdminKycRequestStatus('507f1f77bcf86cd799439011', 'verified');
    const rejected = await updateAdminKycRequestStatus('507f1f77bcf86cd799439011', 'rejected');
    assert.deepEqual(approved, {
      id: '507f1f77bcf86cd799439011',
      status: 'verified',
      hospitalVerificationStatus: 'verified',
    });
    assert.deepEqual(rejected, {
      id: '507f1f77bcf86cd799439011',
      status: 'rejected',
      hospitalVerificationStatus: 'rejected',
    });
    assert.deepEqual(kycStatuses.map(({ status }) => status), ['verified', 'rejected']);
    assert.deepEqual(hospitalStatuses.map(({ status }) => status), ['verified', 'rejected']);
    assert.equal(hospitalStatuses[0].query.hospitalVerificationStatus, 'pending');
    assert.equal(kycStatuses[0].query.status, 'pending');
  } finally {
    KycRequest.findById = originals.kycFindById;
    KycRequest.findOneAndUpdate = originals.kycFindOneAndUpdate;
    User.findOneAndUpdate = originals.userFindOneAndUpdate;
  }
});
