import { Router } from 'express';

import { aiChatRouter } from './ai-chat.routes.js';
import { bloodRequestRouter } from './blood-request.routes.js';
import { campaignRouter } from './campaign.routes.js';
import { kycRequestRouter } from './kyc-request.routes.js';
import { messageRouter } from './message.routes.js';
import { notificationRouter } from './notification.routes.js';
import { userRouter } from './user.routes.js';

export const apiRouter = Router();

apiRouter.use('/ai/chat', aiChatRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/blood-requests', bloodRequestRouter);
apiRouter.use('/campaigns', campaignRouter);
apiRouter.use('/kyc-requests', kycRequestRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/messages', messageRouter);
