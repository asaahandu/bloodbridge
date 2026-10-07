import { timingSafeEqual } from 'node:crypto';

import { env } from '../config/env.js';
import * as adminDashboardService from '../services/admin-dashboard.service.js';
import { AppError } from '../utils/app-error.js';

function getBearerToken(request) {
  const authorization = request.get('authorization');
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  return match?.[1];
}

function tokensMatch(receivedToken, expectedToken) {
  const received = Buffer.from(receivedToken);
  const expected = Buffer.from(expectedToken);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function authenticateAdminDashboard(request, _response, next) {
  const token = getBearerToken(request);
  if (!token) throw new AppError('An admin Bearer token is required', 401);
  if (!env.adminDashboardToken) {
    throw new AppError('Admin dashboard authentication is not configured', 503);
  }
  if (!tokensMatch(token, env.adminDashboardToken)) {
    throw new AppError('Admin authentication is invalid', 401);
  }

  next();
}

export async function getAdminDashboard(_request, response) {
  const dashboard = await adminDashboardService.getAdminDashboard();
  response.json({ data: dashboard });
}
