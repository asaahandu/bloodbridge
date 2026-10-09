import assert from 'node:assert/strict';
import test from 'node:test';

import mongoose from 'mongoose';
import { AIResult } from '../src/models/ai-result.model.js';
import { BloodRequest } from '../src/models/blood-request.model.js';
import { Campaign } from '../src/models/campaign.model.js';
import { Conversation } from '../src/models/conversation.model.js';
import { DonorRequestActivity } from '../src/models/donor-request-activity.model.js';
import { KycRequest } from '../src/models/kyc-request.model.js';
import { Message } from '../src/models/message.model.js';
import { Notification } from '../src/models/notification.model.js';
import { SupportConversation } from '../src/models/support-conversation.model.js';
import { SupportMessage } from '../src/models/support-message.model.js';
import { User } from '../src/models/user.model.js';
import {
  deleteAdminUser,
  getAdminUsers,
  setAdminUserSuspended,
} from '../src/services/admin-dashboard.service.js';
import { authenticateUserToken } from '../src/services/user.service.js';

test('returns paginated admin users without sensitive account fields', async () => {
  const originals = {
    countDocuments: User.countDocuments,
    find: User.find,
  };
  const queryDetails = {};

  User.countDocuments = async (query) => {
    if (query.role === 'donor') return 60;
    if (query.role === 'hospital') return 8;
    return 68;
  };
  User.find = (query) => {
    queryDetails.query = query;
    return {
      select(fields) {
        queryDetails.fields = fields;
        return this;
      },
      sort(sort) {
        queryDetails.sort = sort;
        return this;
      },
      skip(skip) {
        queryDetails.skip = skip;
        return this;
      },
      limit(limit) {
        queryDetails.limit = limit;
        return this;
      },
      async lean() {
        return [{
          _id: 'user-51',
          fullName: 'Amina Bello',
          email: 'amina@example.com',
          phone: '+237600000000',
          role: 'donor',
          cityRegion: 'Douala',
          bloodType: 'O+',
          createdAt: new Date('2026-10-01T10:00:00.000Z'),
        }];
      },
    };
  };

  try {
    const result = await getAdminUsers(2);

    assert.equal(result.total, 68);
    assert.equal(result.donors, 60);
    assert.equal(result.hospitals, 8);
    assert.equal(result.page, 2);
    assert.equal(result.pageSize, 50);
    assert.equal(result.users[0].id, 'user-51');
    assert.equal(result.users[0].bloodType, 'O+');
    assert.equal(result.users[0].suspended, false);
    assert.equal(result.users[0].createdAt, '2026-10-01T10:00:00.000Z');
    assert.equal('passwordHash' in result.users[0], false);
    assert.equal(queryDetails.skip, 50);
    assert.equal(queryDetails.limit, 50);
    assert.equal(queryDetails.fields.includes('passwordHash'), false);
  } finally {
    User.countDocuments = originals.countDocuments;
    User.find = originals.find;
  }
});

test('suspending an admin user clears existing authentication and location sessions', async () => {
  const original = User.findByIdAndUpdate;
  let update;
  User.findByIdAndUpdate = (_id, changes) => {
    update = changes;
    return {
      select() { return this; },
      async lean() { return { _id: 'user-1', accountStatus: 'suspended' }; },
    };
  };

  try {
    const result = await setAdminUserSuspended('user-1', true);
    assert.deepEqual(result, { id: 'user-1', suspended: true });
    assert.deepEqual(update.$set, { accountStatus: 'suspended', authSessions: [] });
    assert.deepEqual(update.$unset, { authTokenHash: 1, locationTrackingTokenHash: 1 });
  } finally {
    User.findByIdAndUpdate = original;
  }
});

test('suspended users cannot continue using existing authentication tokens', async () => {
  const original = User.findOne;
  User.findOne = async () => ({ _id: 'user-1', role: 'donor', accountStatus: 'suspended' });

  try {
    await assert.rejects(
      authenticateUserToken('existing-token'),
      (error) => error.statusCode === 403 && error.message.includes('suspended'),
    );
  } finally {
    User.findOne = original;
  }
});

test('deleting an admin user removes linked records in one transaction', async () => {
  const userId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const requestId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const supportConversationId = 'cccccccccccccccccccccccc';
  const originals = {
    startSession: mongoose.startSession,
    userFindById: User.findById,
    userDeleteOne: User.deleteOne,
  };
  const deletions = [];
  const fakeSession = {
    async withTransaction(work) { await work(); },
    async endSession() {},
  };
  const modelMethods = [
    [Campaign, 'deleteMany'],
    [KycRequest, 'deleteMany'],
    [BloodRequest, 'find'],
    [BloodRequest, 'deleteMany'],
    [DonorRequestActivity, 'deleteMany'],
    [Conversation, 'deleteMany'],
    [Message, 'deleteMany'],
    [AIResult, 'deleteMany'],
    [Notification, 'deleteMany'],
    [SupportMessage, 'deleteMany'],
    [SupportConversation, 'find'],
    [SupportConversation, 'deleteMany'],
  ];
  const modelOriginals = modelMethods.map(([model, method]) => [model, method, model[method]]);

  mongoose.startSession = async () => fakeSession;
  User.findById = () => ({
    select() { return this; },
    session() { return this; },
    async lean() { return { _id: userId }; },
  });
  User.deleteOne = async (filter, options) => {
    deletions.push({ model: 'User', filter, options });
    return { deletedCount: 1 };
  };
  for (const [model, method] of modelMethods) {
    if (method === 'find') {
      model[method] = (filter) => ({
        select() { return this; },
        session() { return this; },
        async lean() {
          return model === BloodRequest ? [{ _id: requestId }] : [{ _id: supportConversationId }];
        },
      });
    } else {
      model[method] = async (filter, options) => {
        deletions.push({ model: model.modelName, filter, options });
      };
    }
  }

  try {
    assert.deepEqual(await deleteAdminUser(userId), { id: userId });
    assert.equal(deletions.length, modelMethods.filter(([, method]) => method === 'deleteMany').length + 1);
    assert.ok(deletions.every(({ options }) => options.session === fakeSession));
    assert.ok(deletions.some(({ model, filter }) =>
      model === 'SupportMessage' &&
      filter.$or.some((entry) => entry.conversationId?.$in?.[0] === supportConversationId)));
    assert.equal(deletions.at(-1).model, 'User');
  } finally {
    mongoose.startSession = originals.startSession;
    User.findById = originals.userFindById;
    User.deleteOne = originals.userDeleteOne;
    for (const [model, method, original] of modelOriginals) model[method] = original;
  }
});

test('clamps page requests beyond the final admin users page', async () => {
  const originals = {
    countDocuments: User.countDocuments,
    find: User.find,
  };
  let requestedSkip;

  User.countDocuments = async (query) => query.role === 'donor' ? 8 : query.role === 'hospital' ? 0 : 8;
  User.find = () => ({
    select() { return this; },
    sort() { return this; },
    skip(skip) { requestedSkip = skip; return this; },
    limit() { return this; },
    async lean() { return []; },
  });

  try {
    const result = await getAdminUsers(4);
    assert.equal(result.page, 1);
    assert.equal(requestedSkip, 0);
  } finally {
    User.countDocuments = originals.countDocuments;
    User.find = originals.find;
  }
});
