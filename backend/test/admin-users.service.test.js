import assert from 'node:assert/strict';
import test from 'node:test';

import { User } from '../src/models/user.model.js';
import { getAdminUsers } from '../src/services/admin-dashboard.service.js';

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
