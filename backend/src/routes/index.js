import { Router } from 'express';

import { aiChatRouter } from './ai-chat.routes.js';
import { bloodRequestRouter } from './blood-request.routes.js';
import { userRouter } from './user.routes.js';

export const apiRouter = Router();

apiRouter.use('/ai/chat', aiChatRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/blood-requests', bloodRequestRouter);
