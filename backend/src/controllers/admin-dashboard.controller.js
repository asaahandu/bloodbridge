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

export async function getAdminUsers(request, response) {
  const page = getPage(request);
  const users = await adminDashboardService.getAdminUsers(page);
  response.json({ data: users });
}

export async function updateAdminUserStatus(request, response) {
  if (!/^[a-f\d]{24}$/i.test(request.params.userId)) {
    throw new AppError('User not found', 404);
  }
  const { suspended } = request.body ?? {};
  if (typeof suspended !== 'boolean') {
    throw new AppError('Suspended must be true or false', 400);
  }
  const user = await adminDashboardService.setAdminUserSuspended(
    request.params.userId,
    suspended,
  );
  response.json({ data: user });
}

export async function deleteAdminUser(request, response) {
  if (!/^[a-f\d]{24}$/i.test(request.params.userId)) {
    throw new AppError('User not found', 404);
  }
  const user = await adminDashboardService.deleteAdminUser(request.params.userId);
  response.json({ data: user });
}

function getPage(request) {
  const pageValue = request.query.page ?? '1';
  const page = Number(pageValue);
  if (typeof pageValue !== 'string' || !/^[1-9]\d*$/.test(pageValue) || !Number.isSafeInteger(page)) {
    throw new AppError('Page must be a positive integer', 400);
  }
  return page;
}

export async function getAdminBloodRequests(request, response) {
  const requests = await adminDashboardService.getAdminBloodRequests(getPage(request));
  response.json({ data: requests });
}

export async function getAdminCampaigns(request, response) {
  const campaigns = await adminDashboardService.getAdminCampaigns(getPage(request));
  response.json({ data: campaigns });
}

export async function getAdminKycRequests(request, response) {
  const requests = await adminDashboardService.getAdminKycRequests(getPage(request));
  response.json({ data: requests });
}

export async function getAdminKycRequest(request, response) {
  const kycRequest = await adminDashboardService.getAdminKycRequest(request.params.requestId);
  response.json({ data: kycRequest });
}

export async function updateAdminKycRequestStatus(request, response) {
  const { status } = request.body ?? {};
  if (status !== 'verified' && status !== 'rejected') {
    throw new AppError('Status must be verified or rejected', 400);
  }
  const kycRequest = await adminDashboardService.updateAdminKycRequestStatus(
    request.params.requestId,
    status,
  );
  response.json({ data: kycRequest });
}

export async function getAdminKycDocument(request, response) {
  const document = await adminDashboardService.getAdminKycDocument(
    request.params.requestId,
    request.params.documentIndex,
  );
  response
    .set('Content-Type', document.mimeType)
    .set('Content-Disposition', 'inline')
    .set('Cache-Control', 'no-store')
    .set('X-Content-Type-Options', 'nosniff')
    .send(document.content);
}
