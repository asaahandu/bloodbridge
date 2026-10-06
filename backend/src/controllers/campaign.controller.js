import * as campaignService from '../services/campaign.service.js';
import * as userService from '../services/user.service.js';
import { AppError } from '../utils/app-error.js';

function getBearerToken(request) {
  const authorization = request.get('authorization');
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  return match?.[1];
}

export async function authenticateHospitalCampaign(request, _response, next) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer authentication token is required', 401);

  request.hospital = await userService.authenticateUserToken(token, 'hospital');
  next();
}

export async function createCampaign(request, response) {
  const campaign = await campaignService.createCampaign(
    request.body,
    request.files,
    request.hospital,
  );
  response.status(201).json({ data: campaign });
}