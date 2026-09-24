import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBloodRequestEmail } from '../src/services/email.service.js';

test('builds a hospital-sent email for a matched donor', () => {
  const email = buildBloodRequestEmail({
    donor: {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
    },
    hospital: {
      fullName: 'City Hospital',
      email: 'hospital@cityhospital.example',
    },
    bloodRequest: {
      _id: 'req_123',
      hospitalName: 'City Hospital',
      bloodType: 'O-',
      city: 'Yaoundé',
      urgency: 'critical',
      internalReference: 'BH-104',
      neededBy: '2026-09-25T12:00:00.000Z',
      unitsNeeded: 2,
      rewardAmount: 15000,
      rewardCurrency: 'XAF',
    },
    matchRank: 3,
    matchPercentage: 92,
  });

  assert.equal(email.from, 'City Hospital <hospital@cityhospital.example>');
  assert.equal(email.to, 'jane@example.com');
  assert.match(email.subject, /O-/);
  assert.match(email.text, /Jane Doe/);
  assert.match(email.text, /Donor reward: 15,000 XAF/);
  assert.match(email.html, /City Hospital/);
  assert.match(email.html, /Critical O-/);
  assert.match(email.html, /Donor reward/);
  assert.match(email.html, /15,000 XAF/);
});
