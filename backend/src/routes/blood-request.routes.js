import { Router } from 'express';

import {
  confirmDonorResponse,
  cancelHospitalBloodRequest,
  createBloodRequest,
  draftBloodRequest,
  getDonorBloodRequest,
  getHospitalBloodRequest,
  getHospitalDonorResponseDetail,
  getHospitalRequestDonorMatches,
  getHospitalRequestRankedDonorMatches,
  listDonorActivity,
  listHospitalBloodRequests,
  listBloodRequests,
  recordDonorOutcome,
  respondToBloodRequest,
  updateHospitalBloodRequest,
} from '../controllers/blood-request.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const bloodRequestRouter = Router();

bloodRequestRouter.post('/draft', asyncHandler(draftBloodRequest));
bloodRequestRouter.get('/activity', asyncHandler(listDonorActivity));
bloodRequestRouter.get('/mine', asyncHandler(listHospitalBloodRequests));
bloodRequestRouter.get(
  '/mine/:requestId/donor-matches',
  asyncHandler(getHospitalRequestDonorMatches),
);
bloodRequestRouter.get(
  '/mine/:requestId/ranked-donor-matches',
  asyncHandler(getHospitalRequestRankedDonorMatches),
);
bloodRequestRouter.get('/mine/:requestId', asyncHandler(getHospitalBloodRequest));
bloodRequestRouter.patch(
  '/mine/:requestId',
  asyncHandler(updateHospitalBloodRequest),
);
bloodRequestRouter.patch(
  '/mine/:requestId/cancel',
  asyncHandler(cancelHospitalBloodRequest),
);
bloodRequestRouter.get(
  '/mine/:requestId/donor-responses/:donorId',
  asyncHandler(getHospitalDonorResponseDetail),
);
bloodRequestRouter.patch(
  '/mine/:requestId/donor-responses/:donorId/confirm',
  asyncHandler(confirmDonorResponse),
);
bloodRequestRouter.patch(
  '/mine/:requestId/donor-responses/:donorId/outcome',
  asyncHandler(recordDonorOutcome),
);
// Keep the donor detail route after the hospital's more specific /mine routes.
bloodRequestRouter.get('/:requestId', asyncHandler(getDonorBloodRequest));
bloodRequestRouter
  .route('/')
  .get(asyncHandler(listBloodRequests))
  .post(asyncHandler(createBloodRequest));
bloodRequestRouter.patch('/:requestId/respond', asyncHandler(respondToBloodRequest));
