import * as notificationInboxService from '../services/notification-inbox.service.js';
import * as userService from '../services/user.service.js';
import { AppError } from '../utils/app-error.js';

function getBearerToken(request) {
  const authorization = request.get('authorization');
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  return match?.[1];
}

async function getAuthenticatedUser(request) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer authentication token is required', 401);
  return userService.authenticateUserToken(token);
}

export async function listNotifications(request, response) {
  const user = await getAuthenticatedUser(request);
  response.json({ data: await notificationInboxService.listNotifications(user._id) });
}

export async function markNotificationsRead(request, response) {
  const user = await getAuthenticatedUser(request);
  await notificationInboxService.markNotificationsRead(user._id);
  response.status(204).send();
}