import { Router } from 'express';

import {
  createAdminSupportMessage,
  getAdminSupportConversations,
  getAdminSupportMessages,
  getUserSupportConversation,
} from '../controllers/support.controller.js';
import { authenticateAdminDashboard } from '../controllers/admin-dashboard.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const supportRouter = Router();
export const adminSupportRouter = Router();

supportRouter.get('/conversation', asyncHandler(getUserSupportConversation));

adminSupportRouter.use(authenticateAdminDashboard);
adminSupportRouter.get('/conversations', asyncHandler(getAdminSupportConversations));
adminSupportRouter.get(
  '/conversations/:conversationId/messages',
  asyncHandler(getAdminSupportMessages),
);
adminSupportRouter.post(
  '/conversations/:conversationId/messages',
  asyncHandler(createAdminSupportMessage),
);
