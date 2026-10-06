import { Router } from 'express';

import {
	authenticateHospitalKycRequest,
	submitKycRequest,
} from '../controllers/kyc-request.controller.js';
import { parseKycUpload } from '../middleware/kyc-upload.js';
import { asyncHandler } from '../utils/async-handler.js';

export const kycRequestRouter = Router();

kycRequestRouter.post(
	'/',
	asyncHandler(authenticateHospitalKycRequest),
	parseKycUpload,
	asyncHandler(submitKycRequest),
);