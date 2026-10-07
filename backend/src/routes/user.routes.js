import { Router } from 'express';

import {
  getCurrentUser,
  loginUser,
  listVoluntaryDonationCentres,
  logoutUser,
  previewDonorMatches,
  registerExpoPushToken,
  registerUser,
  saveUserLocation,
  updateDonationProfile,
  updateHospitalVoluntaryDonation,
  updateNotificationPreferences,
} from '../controllers/user.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const userRouter = Router();

userRouter.post('/login', asyncHandler(loginUser));
userRouter.delete('/me/session', asyncHandler(logoutUser));
userRouter.post('/donor-match-preview', asyncHandler(previewDonorMatches));
userRouter.get('/me', asyncHandler(getCurrentUser));
userRouter.get('/donation-centres', asyncHandler(listVoluntaryDonationCentres));
userRouter.patch('/me/donation-profile', asyncHandler(updateDonationProfile));
userRouter.patch('/me/voluntary-donation', asyncHandler(updateHospitalVoluntaryDonation));
userRouter.patch('/me/notification-preferences', asyncHandler(updateNotificationPreferences));
userRouter.post('/me/push-tokens', asyncHandler(registerExpoPushToken));
userRouter.post('/', asyncHandler(registerUser));
userRouter.patch('/:userId/location', asyncHandler(saveUserLocation));
