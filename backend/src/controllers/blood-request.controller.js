import * as bloodRequestService from '../services/blood-request.service.js';
import * as aiRequestDraftService from '../services/ai-request-draft.service.js';
import * as userService from '../services/user.service.js';
import { AppError } from '../utils/app-error.js';

function getBearerToken(request) {
  const authorization = request.get('authorization');
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  return match?.[1];
}

async function getAuthenticatedHospital(request) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer authentication token is required', 401);
  return userService.authenticateUserToken(token, 'hospital');
}

export async function createBloodRequest(request, response) {
  const hospital = await getAuthenticatedHospital(request);
  const bloodRequest = await bloodRequestService.createBloodRequest(request.body, hospital);
  response.status(201).json({ data: bloodRequest });
}

export async function listHospitalBloodRequests(request, response) {
  const hospital = await getAuthenticatedHospital(request);
  const bloodRequests = await bloodRequestService.listHospitalBloodRequests(
    hospital._id,
    request.query.status,
  );
  response.json({ count: bloodRequests.length, data: bloodRequests });
}

export async function getHospitalBloodRequest(request, response) {
  const hospital = await getAuthenticatedHospital(request);
  const bloodRequest = await bloodRequestService.getHospitalBloodRequest(
    request.params.requestId,
    hospital._id,
  );
  response.json({ data: bloodRequest });
}

export async function getHospitalDonorResponseDetail(request, response) {
  const hospital = await getAuthenticatedHospital(request);
  const detail = await bloodRequestService.getHospitalDonorResponseDetail(
    request.params.requestId,
    request.params.donorId,
    hospital._id,
  );
  response.json({ data: detail });
}

export async function draftBloodRequest(request, response) {
  await getAuthenticatedHospital(request);
  const draft = await aiRequestDraftService.draftBloodRequest(request.body.description);
  response.json({ data: draft });
}

async function getAuthenticatedDonor(request) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer authentication token is required', 401);
  return userService.authenticateUserToken(token, 'donor');
}

export async function getHospitalRequestDonorMatches(request, response) {
  const hospital = await getAuthenticatedHospital(request);
  const matchScan = await bloodRequestService.findHospitalRequestDonorMatches(
    request.params.requestId,
    hospital._id,
  );
  response.json({ data: matchScan });
}

export async function getHospitalRequestRankedDonorMatches(request, response) {
  return getHospitalRequestDonorMatches(request, response);
}

export async function listBloodRequests(request, response) {
  const donor = await getAuthenticatedDonor(request);
  const bloodRequests = await bloodRequestService.listBloodRequests(donor._id);
  response.json({ count: bloodRequests.length, data: bloodRequests });
}

export async function listDonorActivity(request, response) {
  const donor = await getAuthenticatedDonor(request);
  const activities = await bloodRequestService.listDonorActivity(donor._id);
  response.json({ count: activities.length, data: activities });
}

export async function respondToBloodRequest(request, response) {
  const donor = await getAuthenticatedDonor(request);
  const activity = await bloodRequestService.recordDonorResponse(
    request.params.requestId,
    donor._id,
    request.body.decision,
  );
  response.json({ data: activity });
}

export async function confirmDonorResponse(request, response) {
  const hospital = await getAuthenticatedHospital(request);
  const bloodRequest = await bloodRequestService.confirmDonorResponse(
    request.params.requestId,
    request.params.donorId,
    hospital._id,
  );
  response.json({ data: bloodRequest });
}

export async function recordDonorOutcome(request, response) {
  const hospital = await getAuthenticatedHospital(request);
  const bloodRequest = await bloodRequestService.recordDonorOutcome(
    request.params.requestId,
    request.params.donorId,
    hospital._id,
    request.body.outcome,
  );
  response.json({ data: bloodRequest });
}
