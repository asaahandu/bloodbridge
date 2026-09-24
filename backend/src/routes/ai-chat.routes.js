import { Router } from 'express';

import {
  answerEligibilityScreening,
  createChatReply,
  startEligibilityScreening,
} from '../controllers/ai-chat.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const aiChatRouter = Router();

aiChatRouter.post(
  '/eligibility/:requestId/start',
  asyncHandler(startEligibilityScreening),
);
aiChatRouter.post(
  '/eligibility/:requestId/messages',
  asyncHandler(answerEligibilityScreening),
);
aiChatRouter.post('/', asyncHandler(createChatReply));
