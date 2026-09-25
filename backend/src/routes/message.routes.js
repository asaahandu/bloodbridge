import { Router } from 'express';

import { listConversations, listMessages } from '../controllers/message.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const messageRouter = Router();

messageRouter.get('/conversations', asyncHandler(listConversations));
messageRouter.get('/:requestId', asyncHandler(listMessages));