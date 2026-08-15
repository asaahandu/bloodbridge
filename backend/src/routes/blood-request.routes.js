import { Router } from 'express';

import {
  createBloodRequest,
  listBloodRequests,
} from '../controllers/blood-request.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const bloodRequestRouter = Router();

bloodRequestRouter
  .route('/')
  .get(asyncHandler(listBloodRequests))
  .post(asyncHandler(createBloodRequest));
