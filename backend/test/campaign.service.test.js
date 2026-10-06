import assert from 'node:assert/strict';
import test from 'node:test';

import { Campaign } from '../src/models/campaign.model.js';
import { createCampaign } from '../src/services/campaign.service.js';

const hospital = { _id: 'hospital-id', fullName: 'Community Hospital' };

function validFields(overrides = {}) {
  return {
    title: 'Community blood drive',
    date: '2026-10-15',
    location: 'Central Hall',
    description: 'Join our community donation event.',
    ...overrides,
  };
}

test('creates a campaign owned by the hospital and returns image metadata', async () => {
  const originalCreate = Campaign.create;
  let persistedDocument;
  Campaign.create = async (document) => {
    persistedDocument = document;
    return {
      ...document,
      _id: { toString: () => 'campaign-id' },
      createdAt: new Date('2026-09-30T12:00:00.000Z'),
    };
  };

  try {
    const campaign = await createCampaign(
      validFields(),
      [{
        originalname: 'drive.png',
        mimetype: 'image/png',
        size: 8,
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      }],
      hospital,
    );
    console.log('Created campaign:\n', JSON.stringify(campaign, null, 2));

    assert.equal(persistedDocument.hospitalId, hospital._id);
    assert.equal(persistedDocument.hospitalName, hospital.fullName);
    assert.equal(persistedDocument.title, 'Community blood drive');
    assert.equal(persistedDocument.images[0].content.length, 8);
    assert.equal(campaign.id, 'campaign-id');
    assert.deepEqual(campaign.images, [{ name: 'drive.png', mimeType: 'image/png', size: 8 }]);
    assert.equal('content' in campaign.images[0], false);
  } finally {
    Campaign.create = originalCreate;
  }
});

test('rejects impossible campaign dates before writing to MongoDB', async () => {
  await assert.rejects(
    createCampaign(validFields({ date: '2026-02-31' }), [], hospital),
    { message: 'Enter a valid campaign date in YYYY-MM-DD format' },
  );
});

test('rejects image files whose content does not match their declared type', async () => {
  await assert.rejects(
    createCampaign(validFields(), [{
      originalname: 'not-an-image.png',
      mimetype: 'image/png',
      size: 4,
      buffer: Buffer.from('nope'),
    }], hospital),
    { message: 'not-an-image.png is not a valid JPEG or PNG image' },
  );
});