import * as kycRequestService from '../services/kyc-request.service.js';
import * as userService from '../services/user.service.js';
import { AppError } from '../utils/app-error.js';

function getBearerToken(request) {
  const authorization = request.get('authorization');
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  return match?.[1];
}

export async function authenticateHospitalKycRequest(request, _response, next) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer authentication token is required', 401);

  request.hospital = await userService.authenticateUserToken(token, 'hospital');
  next();
}

export async function submitKycRequest(request, response) {
  const result = await kycRequestService.submitKycRequest(
    request.hospital,
    request.body.hospitalName,
    request.files,
  );
  response.status(201).json({ data: result });
}