import { Router } from 'express';

import {
    listNotifications,
    markNotificationsRead,
} from '../controllers/notification.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const notificationRouter = Router();

notificationRouter.get('/', asyncHandler(listNotifications));
notificationRouter.patch('/read', asyncHandler(markNotificationsRead));