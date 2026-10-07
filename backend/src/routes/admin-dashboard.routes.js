import { Router } from 'express';

import {
  authenticateAdminDashboard,
  getAdminDashboard,
} from '../controllers/admin-dashboard.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const adminDashboardRouter = Router();

adminDashboardRouter.get(
  '/dashboard',
  authenticateAdminDashboard,
  asyncHandler(getAdminDashboard),
);
