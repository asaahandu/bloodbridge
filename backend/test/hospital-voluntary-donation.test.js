import assert from 'node:assert/strict';
import test from 'node:test';

import { User } from '../src/models/user.model.js';
import { updateHospitalVoluntaryDonation } from '../src/services/user.service.js';

function savedHospital(settings) {
  return {
    id: 'hospital-id',
    fullName: 'Community Hospital',
    email: 'hospital@example.com',
    phone: '+237600000000',
    role: 'hospital',
    cityRegion: 'Douala',
    voluntaryDonation: settings,
    notificationPreferences: { pushEnabled: true, emailEnabled: true },
  };
}

test('saves voluntary donation settings on the hospital user', async () => {
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  let query;
  let update;
  User.findByIdAndUpdate = async (filter, changes) => {
    query = filter;
    update = changes;
    return savedHospital({ enabled: true, feeXaf: 2500 });
  };

  try {
    const user = await updateHospitalVoluntaryDonation('hospital-id', {
      enabled: true,
      feeXaf: 2500,
    });

    assert.deepEqual(query, { _id: 'hospital-id', role: 'hospital' });
    assert.deepEqual(update.$set, {
      'voluntaryDonation.enabled': true,
      'voluntaryDonation.feeXaf': 2500,
    });
    assert.deepEqual(user.voluntaryDonation, { enabled: true, feeXaf: 2500 });
  } finally {
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

test('rejects invalid voluntary donation settings without updating the user', async () => {
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  User.findByIdAndUpdate = async () => {
    throw new Error('The database should not be updated for invalid settings');
  };

  try {
    await assert.rejects(
      updateHospitalVoluntaryDonation('hospital-id', null),
      { message: 'Voluntary donation must be enabled or disabled' },
    );
    await assert.rejects(
      updateHospitalVoluntaryDonation('hospital-id', { enabled: true, feeXaf: -1 }),
      { message: 'Enter a non-negative whole-number fee in XAF' },
    );
    await assert.rejects(
      updateHospitalVoluntaryDonation('hospital-id', { enabled: true, feeXaf: 1.5 }),
      { message: 'Enter a non-negative whole-number fee in XAF' },
    );
    await assert.rejects(
      updateHospitalVoluntaryDonation('hospital-id', { enabled: 'yes', feeXaf: 0 }),
      { message: 'Voluntary donation must be enabled or disabled' },
    );
  } finally {
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});
