import { BloodRequest } from '../models/blood-request.model.js';

export async function createBloodRequest(payload) {
  return BloodRequest.create(payload);
}

export async function listBloodRequests(filters = {}) {
  const query = { status: 'active' };

  if (filters.bloodType) query.bloodType = filters.bloodType;
  if (filters.city) query.city = new RegExp(`^${escapeRegExp(filters.city)}$`, 'i');
  if (filters.urgency) query.urgency = filters.urgency;

  return BloodRequest.find(query).sort({ urgency: 1, neededBy: 1, createdAt: -1 }).limit(100).lean();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
