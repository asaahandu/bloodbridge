import * as bloodRequestService from '../services/blood-request.service.js';

export async function createBloodRequest(request, response) {
  const bloodRequest = await bloodRequestService.createBloodRequest(request.body);
  response.status(201).json({ data: bloodRequest });
}

export async function listBloodRequests(request, response) {
  const bloodRequests = await bloodRequestService.listBloodRequests(request.query);
  response.json({ count: bloodRequests.length, data: bloodRequests });
}
