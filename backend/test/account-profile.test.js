import assert from 'node:assert/strict';
import test from 'node:test';

import { User } from '../src/models/user.model.js';
import { updateAccountProfile } from '../src/services/user.service.js';

test('updates normalized account contact details for a signed-in user', async () => {
  const original = User.findByIdAndUpdate;
  let query;
  let update;
  let options;
  User.findByIdAndUpdate = async (...args) => {
    [query, update, options] = args;
    return {
      id: 'user-id',
      fullName: 'Amina Bello',
      email: 'amina@example.com',
      phone: '+237600000000',
      role: 'donor',
      cityRegion: 'Douala',
      bloodType: 'O+',
    };
  };

  try {
    const user = await updateAccountProfile('user-id', {
      email: '  AMINA@example.com ',
      phone: ' +237600000000 ',
      cityRegion: ' Douala ',
    });

    assert.equal(query, 'user-id');
    assert.deepEqual(update, {
      $set: {
        email: 'amina@example.com',
        phone: '+237600000000',
        cityRegion: 'Douala',
      },
    });
    assert.deepEqual(options, { new: true, runValidators: true });
    assert.equal(user.email, 'amina@example.com');
    assert.equal(user.phone, '+237600000000');
    assert.equal(user.cityRegion, 'Douala');
    assert.equal('authToken' in user, false);
  } finally {
    User.findByIdAndUpdate = original;
  }
});

test('rejects invalid contact details before updating the account', async () => {
  const original = User.findByIdAndUpdate;
  User.findByIdAndUpdate = async () => {
    throw new Error('The database should not be updated for invalid contact details');
  };

  try {
    await assert.rejects(
      updateAccountProfile('user-id', {
        email: 'not-an-email',
        phone: '+237600000000',
        cityRegion: 'Douala',
      }),
      { message: 'Enter a valid email address', statusCode: 400 },
    );
    await assert.rejects(
      updateAccountProfile('user-id', {
        email: 'amina@example.com',
        phone: '1234',
        cityRegion: 'Douala',
      }),
      { message: 'Enter a valid phone number with at least 8 digits', statusCode: 400 },
    );
    await assert.rejects(
      updateAccountProfile('user-id', {
        email: 'amina@example.com',
        phone: '+237600000000',
        cityRegion: 'D',
      }),
      { message: 'City or region must contain between 2 and 120 characters', statusCode: 400 },
    );
  } finally {
    User.findByIdAndUpdate = original;
  }
});
