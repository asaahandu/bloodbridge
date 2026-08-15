import { Donor } from '../models/donor.model.js';
import { AppError } from '../utils/app-error.js';

export async function createDonor(payload) {
  return Donor.create(payload);
}

export async function listDonors(filters = {}) {
  const query = {};

  if (filters.bloodType) query.bloodType = filters.bloodType;
  if (filters.city) query.city = new RegExp(`^${escapeRegExp(filters.city)}$`, 'i');
  if (filters.available !== undefined) query.isAvailable = filters.available === 'true';

  return Donor.find(query).sort({ createdAt: -1 }).limit(100).lean();
}

export async function getDonorById(id) {
  const donor = await Donor.findById(id).lean();

  if (!donor) throw new AppError('Donor not found', 404);
  return donor;
}

export async function updateDonorAvailability(id, isAvailable) {
  if (typeof isAvailable !== 'boolean') {
    throw new AppError('isAvailable must be a boolean', 400);
  }

  const donor = await Donor.findByIdAndUpdate(id, { isAvailable }, { new: true, runValidators: true });

  if (!donor) throw new AppError('Donor not found', 404);
  return donor;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
