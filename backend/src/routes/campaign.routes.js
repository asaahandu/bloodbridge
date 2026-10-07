import { Router } from 'express';

import {
    authenticateDonorCampaign,
    authenticateHospitalCampaign,
    createCampaign,
    getCampaign,
    getCampaignImage,
    listCampaigns,
} from '../controllers/campaign.controller.js';
import { parseCampaignUpload } from '../middleware/campaign-upload.js';
import { asyncHandler } from '../utils/async-handler.js';

export const campaignRouter = Router();

campaignRouter.get(
  '/',
  asyncHandler(authenticateDonorCampaign),
  asyncHandler(listCampaigns),
);
campaignRouter.get(
  '/:campaignId/images/:imageIndex',
  asyncHandler(authenticateDonorCampaign),
  asyncHandler(getCampaignImage),
);
campaignRouter.get(
  '/:campaignId',
  asyncHandler(authenticateDonorCampaign),
  asyncHandler(getCampaign),
);
campaignRouter.post(
  '/',
  asyncHandler(authenticateHospitalCampaign),
  parseCampaignUpload,
  asyncHandler(createCampaign),
);