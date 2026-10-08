import { Router } from 'express';

import {
    authenticateDonorCampaign,
    authenticateHospitalCampaign,
    createCampaign,
    deleteHospitalCampaign,
    getCampaign,
    getCampaignImage,
    listHospitalCampaigns,
    listCampaigns,
    updateHospitalCampaign,
} from '../controllers/campaign.controller.js';
import { parseCampaignUpload } from '../middleware/campaign-upload.js';
import { asyncHandler } from '../utils/async-handler.js';

export const campaignRouter = Router();

campaignRouter.get(
  '/mine',
  asyncHandler(authenticateHospitalCampaign),
  asyncHandler(listHospitalCampaigns),
);
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
campaignRouter.patch(
  '/:campaignId',
  asyncHandler(authenticateHospitalCampaign),
  parseCampaignUpload,
  asyncHandler(updateHospitalCampaign),
);
campaignRouter.delete(
  '/:campaignId',
  asyncHandler(authenticateHospitalCampaign),
  asyncHandler(deleteHospitalCampaign),
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