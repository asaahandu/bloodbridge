import * as supportService from '../services/support.service.js';
import * as userService from '../services/user.service.js';
import { AppError } from '../utils/app-error.js';

function getBearerToken(request) {
  const match = /^Bearer\s+(.+)$/i.exec(request.get('authorization') ?? '');
  return match?.[1];
}

async function getAuthenticatedUser(request) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A bearer token is required', 401);
  return userService.authenticateUserToken(token);
}

export async function getUserSupportConversation(request, response) {
  const user = await getAuthenticatedUser(request);
  response.json({ data: await supportService.getUserSupportConversation(user) });
}

export async function getAdminSupportConversations(_request, response) {
  response.json({ data: await supportService.listSupportConversations() });
}

export async function getAdminSupportMessages(request, response) {
  response.json({
    data: await supportService.listSupportMessages(request.params.conversationId),
  });
}

export async function createAdminSupportMessage(request, response) {
  const { body } = request.body ?? {};
  const result = await supportService.createAdminSupportMessage(
    request.params.conversationId,
    body,
  );
  request.app
    .get('io')
    .to(`support-conversation:${result.message.conversationId}`)
    .emit('support-message', result.message);
  response.status(201).json({ data: result.message });
}
