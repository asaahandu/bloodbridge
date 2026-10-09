import { Router } from 'express';

import {
  authenticateAdminDashboard,
  getAdminDashboard,
  getAdminBloodRequests,
  getAdminCampaigns,
  getAdminKycDocument,
  getAdminKycRequest,
  getAdminKycRequests,
  getAdminUsers,
  updateAdminUserStatus,
  deleteAdminUser,
  updateAdminKycRequestStatus,
} from '../controllers/admin-dashboard.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const adminDashboardRouter = Router();

adminDashboardRouter.get(
  '/dashboard',
  authenticateAdminDashboard,
  asyncHandler(getAdminDashboard),
);
adminDashboardRouter.get(
  '/users',
  authenticateAdminDashboard,
  asyncHandler(getAdminUsers),
);
adminDashboardRouter.patch(
  '/users/:userId',
  authenticateAdminDashboard,
  asyncHandler(updateAdminUserStatus),
);
adminDashboardRouter.delete(
  '/users/:userId',
  authenticateAdminDashboard,
  asyncHandler(deleteAdminUser),
);
adminDashboardRouter.get(
  '/blood-requests',
  authenticateAdminDashboard,
  asyncHandler(getAdminBloodRequests),
);
adminDashboardRouter.get(
  '/campaigns',
  authenticateAdminDashboard,
  asyncHandler(getAdminCampaigns),
);
adminDashboardRouter.get(
  '/kyc-requests',
  authenticateAdminDashboard,
  asyncHandler(getAdminKycRequests),
);
adminDashboardRouter.get(
  '/kyc-requests/:requestId/documents/:documentIndex',
  authenticateAdminDashboard,
  asyncHandler(getAdminKycDocument),
);
adminDashboardRouter.get(
  '/kyc-requests/:requestId',
  authenticateAdminDashboard,
  asyncHandler(getAdminKycRequest),
);
adminDashboardRouter.patch(
  '/kyc-requests/:requestId',
  authenticateAdminDashboard,
  asyncHandler(updateAdminKycRequestStatus),
);
