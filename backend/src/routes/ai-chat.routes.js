import { Router } from 'express';

import {
    answerEligibilityScreening,
    createChatReply,
    skipEligibilityScreening,
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
aiChatRouter.post(
  '/eligibility/:requestId/skip',
  asyncHandler(skipEligibilityScreening),
);
aiChatRouter.post('/', asyncHandler(createChatReply));
