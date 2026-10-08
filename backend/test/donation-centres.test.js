import assert from 'node:assert/strict';
import test from 'node:test';

import { User } from '../src/models/user.model.js';
import { listVoluntaryDonationCentres } from '../src/services/user.service.js';

test('lists enabled donation centres with contact details but without unrelated account data', async () => {
  const originalFind = User.find;
  let query;
  let projection;
  let sort;
  User.find = (filter) => {
    query = filter;
    return {
      select(fields) {
        projection = fields;
        return this;
      },
      sort(order) {
        sort = order;
        return this;
      },
      async lean() {
        return [
          {
            _id: 'hospital-id',
            fullName: 'Community Hospital',
            cityRegion: 'Douala',
            email: 'private@example.com',
            phone: '+237600000000',
            voluntaryDonation: { enabled: true, feeXaf: 2500 },
            hospitalVerificationStatus: 'verified',
            location: { coordinates: [9.7, 4.05] },
          },
        ];
      },
    };
  };

  try {
    const centres = await listVoluntaryDonationCentres();

    assert.deepEqual(query, { role: 'hospital', 'voluntaryDonation.enabled': true });
    assert.equal(projection, 'fullName email phone cityRegion location voluntaryDonation hospitalVerificationStatus');
    assert.deepEqual(sort, { fullName: 1 });
    assert.deepEqual(centres, [
      {
        id: 'hospital-id',
        name: 'Community Hospital',
        email: 'private@example.com',
        phone: '+237600000000',
        cityRegion: 'Douala',
        feeXaf: 2500,
        hospitalVerificationStatus: 'verified',
        coordinates: [9.7, 4.05],
      },
    ]);
  } finally {
    User.find = originalFind;
  }
});
