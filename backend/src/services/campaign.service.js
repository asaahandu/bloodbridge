import mongoose from 'mongoose';

import { Campaign } from '../models/campaign.model.js';
import { AppError } from '../utils/app-error.js';

const MAX_TOTAL_IMAGE_SIZE = 10 * 1024 * 1024;
const imageSignatures = {
  'image/jpeg': (buffer) => buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  'image/png': (buffer) =>
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
};

function normalizeCampaignFields(fields) {
  const title = typeof fields.title === 'string' ? fields.title.trim() : '';
  const location = typeof fields.location === 'string' ? fields.location.trim() : '';
  const description = typeof fields.description === 'string' ? fields.description.trim() : '';
  const dateValue = typeof fields.date === 'string' ? fields.date : '';
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const date = dateMatch ? new Date(`${dateValue}T00:00:00.000Z`) : null;

  if (!title || title.length > 100) {
    throw new AppError('Enter a campaign title no longer than 100 characters', 400);
  }
  if (
    !date ||
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(dateMatch[1]) ||
    date.getUTCMonth() + 1 !== Number(dateMatch[2]) ||
    date.getUTCDate() !== Number(dateMatch[3])
  ) {
    throw new AppError('Enter a valid campaign date in YYYY-MM-DD format', 400);
  }
  if (!location || location.length > 160) {
    throw new AppError('Enter a campaign location no longer than 160 characters', 400);
  }
  if (!description || description.length > 1000) {
    throw new AppError('Enter a campaign description no longer than 1000 characters', 400);
  }

  return { title, date, location, description };
}

function normalizeCampaignImages(files) {
  if (!Array.isArray(files) || files.length > 5) {
    throw new AppError('Attach no more than five campaign images', 400);
  }

  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_IMAGE_SIZE) {
    throw new AppError('Campaign images must total 10 MB or less', 400);
  }

  return files.map((file) => {
    const isValidImage = imageSignatures[file.mimetype]?.(file.buffer);
    if (!isValidImage) {
      throw new AppError(`${file.originalname} is not a valid JPEG or PNG image`, 400);
    }

    return {
      name: file.originalname.slice(0, 255),
      mimeType: file.mimetype,
      size: file.size,
      content: file.buffer,
    };
  });
}

function serializeCampaign(campaign) {
  return {
    id: String(campaign._id),
    title: campaign.title,
    hospitalName: campaign.hospitalName,
    date: campaign.date,
    location: campaign.location,
    description: campaign.description,
    images: campaign.images.map(({ name, mimeType, size }, index) => ({
      name,
      mimeType,
      size,
      index,
    })),
    createdAt: campaign.createdAt,
  };
}

export async function createCampaign(fields, files, hospital) {
  const campaignFields = normalizeCampaignFields(fields);
  const images = normalizeCampaignImages(files);
  const campaign = await Campaign.create({
    ...campaignFields,
    hospitalId: hospital._id,
    hospitalName: hospital.fullName,
    images,
  });

  return serializeCampaign(campaign);
}

export async function listCampaigns() {
  const campaigns = await Campaign.find().sort({ date: 1, createdAt: -1 }).lean();
  return campaigns.map(serializeCampaign);
}

export async function getCampaign(campaignId) {
  if (!mongoose.isValidObjectId(campaignId)) throw new AppError('Campaign not found', 404);

  const campaign = await Campaign.findById(campaignId).lean();
  if (!campaign) throw new AppError('Campaign not found', 404);

  return serializeCampaign(campaign);
}

export async function getCampaignImage(campaignId, imageIndex) {
  if (!mongoose.isValidObjectId(campaignId) || !/^\d+$/.test(imageIndex)) {
    throw new AppError('Campaign image not found', 404);
  }

  const campaign = await Campaign.findById(campaignId).select(
    'images.name images.mimeType images.size +images.content',
  );
  const image = campaign?.images[Number(imageIndex)];
  if (!image) throw new AppError('Campaign image not found', 404);
  if (!Buffer.isBuffer(image.content) || image.content.length === 0) {
    throw new AppError('Campaign image data is unavailable', 404);
  }

  return { content: Buffer.from(image.content), mimeType: image.mimeType };
}