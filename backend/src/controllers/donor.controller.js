import * as donorService from '../services/donor.service.js';

export async function createDonor(request, response) {
  const donor = await donorService.createDonor(request.body);
  response.status(201).json({ data: donor });
}

export async function listDonors(request, response) {
  const donors = await donorService.listDonors(request.query);
  response.json({ count: donors.length, data: donors });
}

export async function getDonor(request, response) {
  const donor = await donorService.getDonorById(request.params.donorId);
  response.json({ data: donor });
}

export async function updateAvailability(request, response) {
  const donor = await donorService.updateDonorAvailability(
    request.params.donorId,
    request.body.isAvailable,
  );
  response.json({ data: donor });
}
