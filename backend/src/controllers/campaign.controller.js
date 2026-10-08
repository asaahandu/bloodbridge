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

export async function authenticateDonorCampaign(request, _response, next) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A ****** token is required', 401);

  await userService.authenticateUserToken(token, 'donor');
  next();
}

export async function listCampaigns(_request, response) {
  const campaigns = await campaignService.listCampaigns();
  response.json({ data: campaigns });
}

export async function listHospitalCampaigns(request, response) {
  const campaigns = await campaignService.listHospitalCampaigns(request.hospital._id);
  response.json({ data: campaigns });
}

export async function getCampaign(request, response) {
  const campaign = await campaignService.getCampaign(request.params.campaignId);
  response.json({ data: campaign });
}

export async function getCampaignImage(request, response) {
  const image = await campaignService.getCampaignImage(
    request.params.campaignId,
    request.params.imageIndex,
  );
  response.json({
    data: {
      mimeType: image.mimeType,
      contentBase64: image.content.toString('base64'),
    },
  });
}

export async function createCampaign(request, response) {
  const campaign = await campaignService.createCampaign(
    request.body,
    request.files,
    request.hospital,
  );
  response.status(201).json({ data: campaign });
}

export async function updateHospitalCampaign(request, response) {
  const campaign = await campaignService.updateHospitalCampaign(
    request.params.campaignId,
    request.body,
    request.files,
    request.body.keepImageIndices,
    request.hospital,
  );
  response.json({ data: campaign });
}

export async function deleteHospitalCampaign(request, response) {
  await campaignService.deleteHospitalCampaign(request.params.campaignId, request.hospital._id);
  response.status(204).end();
}