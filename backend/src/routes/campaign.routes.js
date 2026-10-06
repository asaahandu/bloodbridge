import { Router } from 'express';

import {
    authenticateHospitalCampaign,
    createCampaign,
} from '../controllers/campaign.controller.js';
import { parseCampaignUpload } from '../middleware/campaign-upload.js';
import { asyncHandler } from '../utils/async-handler.js';

export const campaignRouter = Router();

campaignRouter.post(
  '/',
  asyncHandler(authenticateHospitalCampaign),
  parseCampaignUpload,
  asyncHandler(createCampaign),
);