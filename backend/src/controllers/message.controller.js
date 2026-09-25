import * as messageService from '../services/message.service.js';
import * as userService from '../services/user.service.js';
import { AppError } from '../utils/app-error.js';

function getBearerToken(request) {
  const match = /^Bearer\s+(.+)$/i.exec(request.get('authorization') ?? '');
  return match?.[1];
}

async function getAuthenticatedUser(request) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer authentication token is required', 401);
  return userService.authenticateUserToken(token);
}

export async function listConversations(request, response) {
  const user = await getAuthenticatedUser(request);
  response.json({ data: await messageService.listConversations(user) });
}

export async function listMessages(request, response) {
  const user = await getAuthenticatedUser(request);
  response.json({
    data: await messageService.listMessages(request.params.requestId, user, request.query.donorId),
  });
}