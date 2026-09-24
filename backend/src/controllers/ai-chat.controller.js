import * as aiChatService from '../services/ai-chat.service.js';
import * as aiEligibilityService from '../services/ai-eligibility.service.js';
import * as userService from '../services/user.service.js';
import { AppError } from '../utils/app-error.js';

function getBearerToken(request) {
  const authorization = request.get('authorization');
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  return match?.[1];
}

export async function createChatReply(request, response) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer authentication token is required', 401);

  const user = await userService.authenticateUserToken(token);
  const reply = await aiChatService.createChatReply(request.body.messages, user.role);
  response.json({ data: reply });
}

async function getAuthenticatedDonor(request) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer authentication token is required', 401);
  return userService.authenticateUserToken(token, 'donor');
}

export async function startEligibilityScreening(request, response) {
  const donor = await getAuthenticatedDonor(request);
  const result = await aiEligibilityService.startEligibilityScreening(
    request.params.requestId,
    donor,
  );
  response.status(201).json({ data: result });
}

export async function answerEligibilityScreening(request, response) {
  const donor = await getAuthenticatedDonor(request);
  const result = await aiEligibilityService.answerEligibilityScreening(
    request.params.requestId,
    donor,
    request.body.message,
  );
  response.json({ data: result });
}
