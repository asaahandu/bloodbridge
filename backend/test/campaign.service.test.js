import assert from 'node:assert/strict';
import test from 'node:test';

import { Campaign } from '../src/models/campaign.model.js';
import {
  createCampaign,
  deleteHospitalCampaign,
  getCampaign,
  getCampaignImage,
  listCampaigns,
  listHospitalCampaigns,
  updateHospitalCampaign,
} from '../src/services/campaign.service.js';

const hospital = {
  _id: 'hospital-id',
  fullName: 'Community Hospital',
  email: 'contact@communityhospital.example',
  phone: '+237600000000',
  cityRegion: 'Douala',
  hospitalVerificationStatus: 'verified',
};

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
      hospitalId: {
        fullName: hospital.fullName,
        email: hospital.email,
        phone: hospital.phone,
        cityRegion: hospital.cityRegion,
        hospitalVerificationStatus: hospital.hospitalVerificationStatus,
      },
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
    assert.equal(campaign.hospitalName, hospital.fullName);
    assert.equal(campaign.hospitalVerificationStatus, 'verified');
    assert.deepEqual(campaign.images, [
      { name: 'drive.png', mimeType: 'image/png', size: 8, index: 0 },
    ]);
    assert.equal('content' in campaign.images[0], false);
  } finally {
    Campaign.create = originalCreate;
  }
});

test('lists database campaigns with preview metadata and hospital details', async () => {
  const originalFind = Campaign.find;
  let populatedFields;
  let sortOptions;
  Campaign.find = () => ({
    populate(options) {
      populatedFields = options;
      return this;
    },
    sort(options) {
      sortOptions = options;
      return this;
    },
    async lean() {
      return [
        {
          _id: 'campaign-id',
          title: 'Community blood drive',
          hospitalName: hospital.fullName,
          hospitalId: {
            fullName: hospital.fullName,
            email: hospital.email,
            phone: hospital.phone,
            cityRegion: hospital.cityRegion,
            hospitalVerificationStatus: 'verified',
          },
          date: new Date('2026-10-15T00:00:00.000Z'),
          location: 'Central Hall',
          description: 'Join our community donation event.',
          images: [{ name: 'drive.png', mimeType: 'image/png', size: 8 }],
          createdAt: new Date('2026-09-30T12:00:00.000Z'),
        },
      ];
    },
  });

  try {
    const campaigns = await listCampaigns();

    assert.deepEqual(populatedFields, {
      path: 'hospitalId',
      select: 'fullName email phone cityRegion hospitalVerificationStatus',
    });
    assert.deepEqual(sortOptions, { date: 1, createdAt: -1 });
    assert.equal(campaigns.length, 1);
    assert.equal(campaigns[0].hospitalName, hospital.fullName);
    assert.equal(campaigns[0].hospitalVerificationStatus, 'verified');
    assert.deepEqual(campaigns[0].hospital, {
      name: hospital.fullName,
      email: hospital.email,
      phone: hospital.phone,
      cityRegion: hospital.cityRegion,
      verificationStatus: 'verified',
    });
    assert.deepEqual(campaigns[0].images, [
      { name: 'drive.png', mimeType: 'image/png', size: 8, index: 0 },
    ]);
    assert.equal('content' in campaigns[0].images[0], false);
  } finally {
    Campaign.find = originalFind;
  }
});

test('lists only the signed-in hospital campaigns, newest first', async () => {
  const originalFind = Campaign.find;
  let query;
  let sortOptions;
  Campaign.find = (value) => {
    query = value;
    return {
      populate() {
        return this;
      },
      sort(options) {
        sortOptions = options;
        return this;
      },
      async lean() {
        return [
          {
            _id: 'own-campaign',
            title: 'My blood drive',
            hospitalName: hospital.fullName,
            hospitalId: {
              fullName: hospital.fullName,
              email: hospital.email,
              phone: hospital.phone,
              cityRegion: hospital.cityRegion,
              hospitalVerificationStatus: 'verified',
            },
            date: new Date('2026-10-15T00:00:00.000Z'),
            location: 'Central Hall',
            description: 'Join our community donation event.',
            images: [],
            createdAt: new Date('2026-10-01T12:00:00.000Z'),
          },
        ];
      },
    };
  };

  try {
    const campaigns = await listHospitalCampaigns(hospital._id);

    assert.deepEqual(query, { hospitalId: hospital._id });
    assert.deepEqual(sortOptions, { createdAt: -1 });
    assert.equal(campaigns.length, 1);
    assert.equal(campaigns[0].id, 'own-campaign');
    assert.equal(campaigns[0].title, 'My blood drive');
  } finally {
    Campaign.find = originalFind;
  }
});

test('updates a hospital campaign and retains only the selected existing images', async () => {
  const originalFindOne = Campaign.findOne;
  const campaign = {
    _id: '507f1f77bcf86cd799439011',
    hospitalId: hospital._id,
    hospitalName: hospital.fullName,
    title: 'Old title',
    date: new Date('2026-10-15T00:00:00.000Z'),
    location: 'Old location',
    description: 'Old description',
    images: [
      { name: 'keep.png', mimeType: 'image/png', size: 8, content: Buffer.from('keep') },
      { name: 'remove.png', mimeType: 'image/png', size: 8, content: Buffer.from('remove') },
    ],
    createdAt: new Date('2026-09-30T12:00:00.000Z'),
    async save() {},
  };
  let selectedFields;
  Campaign.findOne = (query) => {
    assert.deepEqual(query, {
      _id: '507f1f77bcf86cd799439011',
      hospitalId: hospital._id,
    });
    return {
      select(fields) {
        selectedFields = fields;
        return Promise.resolve(campaign);
      },
    };
  };

  try {
    const updated = await updateHospitalCampaign(
      '507f1f77bcf86cd799439011',
      validFields({ title: 'Updated drive', location: 'New hall' }),
      [],
      '[0]',
      hospital,
    );

    assert.equal(selectedFields, '+images.content');
    assert.equal(campaign.title, 'Updated drive');
    assert.equal(campaign.location, 'New hall');
    assert.deepEqual(campaign.images.map((image) => image.name), ['keep.png']);
    assert.equal(updated.title, 'Updated drive');
    assert.equal(updated.images[0].name, 'keep.png');
    assert.equal('content' in updated.images[0], false);
  } finally {
    Campaign.findOne = originalFindOne;
  }
});

test('does not update a campaign that is not owned by the hospital', async () => {
  const originalFindOne = Campaign.findOne;
  Campaign.findOne = () => ({
    select() {
      return Promise.resolve(null);
    },
  });

  try {
    await assert.rejects(
      updateHospitalCampaign(
        '507f1f77bcf86cd799439011',
        validFields(),
        [],
        '[]',
        hospital,
      ),
      { message: 'Campaign not found' },
    );
  } finally {
    Campaign.findOne = originalFindOne;
  }
});

test('rejects invalid retained image selections', async () => {
  const originalFindOne = Campaign.findOne;
  Campaign.findOne = () => ({
    select() {
      return Promise.resolve({
        images: [],
      });
    },
  });

  try {
    await assert.rejects(
      updateHospitalCampaign(
        '507f1f77bcf86cd799439011',
        validFields(),
        [],
        '[0]',
        hospital,
      ),
      { message: 'Campaign images selection is invalid' },
    );
  } finally {
    Campaign.findOne = originalFindOne;
  }
});

test('deletes only a campaign owned by the hospital', async () => {
  const originalFindOneAndDelete = Campaign.findOneAndDelete;
  let query;
  Campaign.findOneAndDelete = async (value) => {
    query = value;
    return { _id: value._id };
  };

  try {
    await deleteHospitalCampaign('507f1f77bcf86cd799439011', hospital._id);
    assert.deepEqual(query, {
      _id: '507f1f77bcf86cd799439011',
      hospitalId: hospital._id,
    });

    Campaign.findOneAndDelete = async () => null;
    await assert.rejects(
      deleteHospitalCampaign('507f1f77bcf86cd799439011', hospital._id),
      { message: 'Campaign not found' },
    );
  } finally {
    Campaign.findOneAndDelete = originalFindOneAndDelete;
  }
});

test('loads a campaign with public hospital contact details', async () => {
  const originalFindById = Campaign.findById;
  let populatedFields;
  Campaign.findById = () => ({
    populate(options) {
      populatedFields = options;
      return this;
    },
    async lean() {
      return {
        _id: 'campaign-id',
        title: 'Community blood drive',
        hospitalName: hospital.fullName,
        hospitalId: {
          fullName: hospital.fullName,
          email: hospital.email,
          phone: hospital.phone,
          cityRegion: hospital.cityRegion,
          hospitalVerificationStatus: hospital.hospitalVerificationStatus,
        },
        date: new Date('2026-10-15T00:00:00.000Z'),
        location: 'Central Hall',
        description: 'Join our community donation event.',
        images: [],
        createdAt: new Date('2026-09-30T12:00:00.000Z'),
      };
    },
  });

  try {
    const campaign = await getCampaign('507f1f77bcf86cd799439011');

    assert.deepEqual(populatedFields, {
      path: 'hospitalId',
      select: 'fullName email phone cityRegion hospitalVerificationStatus',
    });
    assert.deepEqual(campaign.hospital, {
      name: hospital.fullName,
      email: hospital.email,
      phone: hospital.phone,
      cityRegion: hospital.cityRegion,
      verificationStatus: 'verified',
    });
  } finally {
    Campaign.findById = originalFindById;
  }
});

test('returns the selected campaign image content and MIME type', async () => {
  const originalFindById = Campaign.findById;
  const imageContent = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  let selectedFields;
  Campaign.findById = () => ({
    select(fields) {
      selectedFields = fields;
      return Promise.resolve({
        images: [{ content: imageContent, mimeType: 'image/png' }],
      });
    },
  });

  try {
    const image = await getCampaignImage('507f1f77bcf86cd799439011', '0');

    assert.equal(selectedFields, 'images.name images.mimeType images.size +images.content');
    assert.deepEqual(image.content, imageContent);
    assert.equal(image.mimeType, 'image/png');
  } finally {
    Campaign.findById = originalFindById;
  }
});

test('rejects campaign images with missing binary data', async () => {
  const originalFindById = Campaign.findById;
  Campaign.findById = () => ({
    select() {
      return Promise.resolve({ images: [{ content: undefined, mimeType: 'image/png' }] });
    },
  });

  try {
    await assert.rejects(
      getCampaignImage('507f1f77bcf86cd799439011', '0'),
      { message: 'Campaign image data is unavailable' },
    );
  } finally {
    Campaign.findById = originalFindById;
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