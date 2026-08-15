import { Router } from 'express';

import {
  createDonor,
  getDonor,
  listDonors,
  updateAvailability,
} from '../controllers/donor.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const donorRouter = Router();

donorRouter.route('/').get(asyncHandler(listDonors)).post(asyncHandler(createDonor));
donorRouter.get('/:donorId', asyncHandler(getDonor));
donorRouter.patch('/:donorId/availability', asyncHandler(updateAvailability));
