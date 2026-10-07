import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBloodRequestWhatsAppMessage } from '../src/services/whatsapp.service.js';

const requestDetails = {
  donor: { fullName: 'Jane Doe', phone: '+237 6 00 00 00 00' },
  hospital: { fullName: 'City Hospital' },
  bloodRequest: {
    bloodType: 'O-',
    city: 'Yaoundé',
    urgency: 'critical',
    neededBy: '2026-10-08T12:00:00.000Z',
  },
  matchRank: 3,
};

test('builds a WhatsApp template request for a donor phone in international format', () => {
  const message = buildBloodRequestWhatsAppMessage(requestDetails);

  assert.equal(message.messaging_product, 'whatsapp');
  assert.equal(message.to, '237600000000');
  assert.equal(message.type, 'template');
  const parameters = message.template.components[0].parameters.map(
    (parameter) => parameter.text,
  );
  assert.deepEqual(parameters.slice(0, 6), [
    'Jane Doe',
    'City Hospital',
    'Critical',
    'O-',
    'Yaoundé',
    '3',
  ]);
  assert.match(parameters[6], /2026/);
  assert.doesNotMatch(parameters[6], /Reward/);
});

test('includes an offered reward in WhatsApp request details', () => {
  const message = buildBloodRequestWhatsAppMessage({
    ...requestDetails,
    bloodRequest: {
      ...requestDetails.bloodRequest,
      rewardAmount: 25000,
      rewardCurrency: 'XAF',
    },
  });

  const parameters = message.template.components[0].parameters.map(
    (parameter) => parameter.text,
  );
  assert.match(parameters[6], /Reward: 25,000 XAF/);
});

test('does not include a reward when the request has no reward amount', () => {
  const message = buildBloodRequestWhatsAppMessage({
    ...requestDetails,
    bloodRequest: {
      ...requestDetails.bloodRequest,
      rewardAmount: null,
      rewardCurrency: undefined,
    },
  });

  const parameters = message.template.components[0].parameters.map(
    (parameter) => parameter.text,
  );
  assert.doesNotMatch(parameters[6], /Reward/);
});

test('rejects a local phone number without an international country code', () => {
  assert.throws(
    () =>
      buildBloodRequestWhatsAppMessage({
        ...requestDetails,
        donor: { ...requestDetails.donor, phone: '6 00 00 00 00' },
      }),
    /international format/,
  );
});
