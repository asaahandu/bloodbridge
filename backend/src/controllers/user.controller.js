import * as userService from '../services/user.service.js';
import { AppError } from '../utils/app-error.js';

function getBearerToken(request) {
  const authorization = request.get('authorization');
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  return match?.[1];
}

export async function registerUser(request, response) {
  const result = await userService.registerUser(request.body);

  response.status(201).json({
    data: {
      locationTrackingToken: result.locationTrackingToken,
      user: result.user,
    },
  });
}

export async function loginUser(request, response) {
  const result = await userService.loginUser(request.body);
  response.json({ data: result });
}

export async function logoutUser(request, response) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer authentication token is required', 401);

  await userService.logoutUser(token);
  response.status(204).send();
}

export async function previewDonorMatches(request, response) {
  const preview = await userService.previewDonorMatches(request.body);
  response.json({ data: preview });
}

export async function getCurrentUser(request, response) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer authentication token is required', 401);

  const user = await userService.getCurrentUser(token);
  response.json({ data: { user } });
}

export async function updateNotificationPreferences(request, response) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer authentication token is required', 401);

  const donor = await userService.authenticateUserToken(token, 'donor');
  const user = await userService.updateNotificationPreferences(donor._id, request.body);
  response.json({ data: { user } });
}

export async function updateDonationProfile(request, response) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer authentication token is required', 401);

  const donor = await userService.authenticateUserToken(token, 'donor');
  const user = await userService.updateDonationProfile(donor._id, request.body);
  response.json({ data: { user } });
}

export async function registerExpoPushToken(request, response) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer authentication token is required', 401);

  const donor = await userService.authenticateUserToken(token, 'donor');
  const registration = await userService.registerExpoPushToken(donor._id, request.body);
  response.json({ data: registration });
}

export async function saveUserLocation(request, response) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('A Bearer location tracking token is required', 401);

  const user = await userService.saveUserLocation(request.params.userId, token, request.body);
  response.json({ data: { user } });
}
