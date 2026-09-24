import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { env } from '../config/env.js';
import {
    COMPATIBLE_DONOR_BLOOD_TYPES,
    DONOR_SEARCH_RADIUS_KM,
} from '../constants/blood-compatibility.js';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new AppError('Password must contain at least 8 characters', 400);
  }

  if (password.length > 128) {
    throw new AppError('Password cannot exceed 128 characters', 400);
  }
}

function serializeUser(user) {
  return {
    _id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    cityRegion: user.cityRegion,
    ...(user.bloodType ? { bloodType: user.bloodType } : {}),
    ...(user.role === 'donor' ? { donationProfile: serializeDonationProfile(user) } : {}),
    notificationPreferences: {
      pushEnabled: user.notificationPreferences?.pushEnabled ?? true,
      emailEnabled: user.notificationPreferences?.emailEnabled ?? true,
    },
    ...(user.location
      ? {
          location: {
            coordinates: [...user.location.coordinates],
            accuracy: user.location.accuracy,
            capturedAt: user.location.capturedAt,
          },
        }
      : {}),
  };
}

function isExpoPushToken(token) {
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);
}

export async function registerUser(payload) {
  validatePassword(payload.password);

  if (payload.termsAccepted !== true) {
    throw new AppError('Terms of Service and Privacy Policy must be accepted', 400);
  }

  const locationTrackingToken = randomBytes(32).toString('hex');
  const passwordHash = await hashPassword(payload.password);

  const user = await User.create({
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    cityRegion: payload.cityRegion,
    role: payload.role,
    ...(payload.role === 'donor'
      ? {
          dateOfBirth: payload.dateOfBirth,
          gender: payload.gender,
          bloodType: payload.bloodType,
          receivesAlerts: payload.receivesAlerts,
        }
      : {}),
    termsAcceptedAt: new Date(),
    passwordHash,
    locationTrackingTokenHash: hashToken(locationTrackingToken),
  });

  return { locationTrackingToken, user };
}

export async function loginUser(payload) {
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';

  if (!email || !password || password.length > 128) {
    throw new AppError('Invalid email or password', 401);
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  const passwordMatches = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  const authToken = randomBytes(32).toString('hex');
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        authSessions: { tokenHash: hashToken(authToken), createdAt: new Date() },
      },
    },
  );

  return {
    authToken,
    user: serializeUser(user),
  };
}

export async function authenticateUserToken(token, requiredRole) {
  if (!token) throw new AppError('Authentication is required', 401);

  const tokenHash = hashToken(token);
  const user = await User.findOne({
    $or: [{ authTokenHash: tokenHash }, { 'authSessions.tokenHash': tokenHash }],
  });
  if (!user) throw new AppError('Authentication is invalid or expired', 401);

  if (requiredRole && user.role !== requiredRole) {
    throw new AppError('This action is not available for your account role', 403);
  }

  return user;
}

export async function logoutUser(token) {
  const user = await authenticateUserToken(token);
  const tokenHash = hashToken(token);

  await User.updateOne(
    { _id: user._id },
    { $pull: { authSessions: { tokenHash } } },
  );

  // Tokens issued by earlier BloodBridge versions stay valid until that
  // particular session explicitly signs out.
  await User.updateOne(
    { _id: user._id, authTokenHash: tokenHash },
    { $unset: { authTokenHash: 1 } },
  );
}

export async function getCurrentUser(token) {
  const user = await authenticateUserToken(token);
  return serializeUser(user);
}

export async function updateNotificationPreferences(userId, payload) {
  const pushEnabled = payload.pushEnabled;
  const emailEnabled = payload.emailEnabled;

  if (typeof pushEnabled !== 'boolean' || typeof emailEnabled !== 'boolean') {
    throw new AppError('Notification preferences must be true or false', 400);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        'notificationPreferences.pushEnabled': pushEnabled,
        'notificationPreferences.emailEnabled': emailEnabled,
      },
    },
    { new: true, runValidators: true },
  );
  if (!user) throw new AppError('User not found', 404);

  return serializeUser(user);
}

function serializeDonationProfile(user) {
  if (user.role !== 'donor') return undefined;

  const lastDonationAt = user.donationProfile?.lastDonationAt;
  const nextEligibleAt = lastDonationAt
    ? new Date(
        lastDonationAt.getTime() + env.donationMinimumIntervalDays * 24 * 60 * 60 * 1000,
      )
    : undefined;

  return {
    availabilityPreset: user.donationProfile?.availabilityPreset ?? 'anytime',
    maxTravelDistanceKm: user.donationProfile?.maxTravelDistanceKm ?? 25,
    eligibilityStatus: !lastDonationAt
      ? 'needs_verification'
      : nextEligibleAt <= new Date()
        ? 'interval_clear'
        : 'waiting_period',
    ...(lastDonationAt ? { lastDonationAt } : {}),
    ...(nextEligibleAt ? { nextEligibleAt } : {}),
  };
}

export async function updateDonationProfile(userId, payload) {
  const availabilityPreset = payload.availabilityPreset;
  const maxTravelDistanceKm = Number(payload.maxTravelDistanceKm);
  const allowedPresets = ['anytime', 'weekdays', 'weekends', 'daytime', 'evenings'];

  if (!allowedPresets.includes(availabilityPreset)) {
    throw new AppError('Choose a valid donor availability preference', 400);
  }
  if (![10, 25, 50].includes(maxTravelDistanceKm)) {
    throw new AppError('Travel distance must be 10, 25, or 50 kilometres', 400);
  }

  let lastDonationAt;
  if (payload.lastDonationAt != null && payload.lastDonationAt !== '') {
    lastDonationAt = new Date(payload.lastDonationAt);
    if (Number.isNaN(lastDonationAt.getTime()) || lastDonationAt > new Date()) {
      throw new AppError('Last donation date must be a valid past date', 400);
    }
  }

  const user = await User.findById(userId);
  if (!user || user.role !== 'donor') throw new AppError('Donor account not found', 404);

  user.donationProfile ??= {};
  user.donationProfile.availabilityPreset = availabilityPreset;
  user.donationProfile.maxTravelDistanceKm = maxTravelDistanceKm;
  user.donationProfile.lastDonationAt = lastDonationAt;
  await user.save();

  return serializeUser(user);
}

export async function registerExpoPushToken(userId, payload) {
  const token = typeof payload.token === 'string' ? payload.token.trim() : '';
  const platform = payload.platform;

  if (!isExpoPushToken(token)) throw new AppError('A valid Expo push token is required', 400);
  if (!['android', 'ios'].includes(platform)) {
    throw new AppError('Push token platform must be android or ios', 400);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  user.expoPushTokens = [
    { token, platform, updatedAt: new Date() },
    ...user.expoPushTokens.filter((entry) => entry.token !== token),
  ].slice(0, 5);
  await user.save();

  return { registered: true };
}

export async function previewDonorMatches(payload) {
  const longitude = Number(payload.longitude);
  const latitude = Number(payload.latitude);
  const bloodType = typeof payload.bloodType === 'string' ? payload.bloodType : '';
  const urgency = typeof payload.urgency === 'string' ? payload.urgency : '';
  const compatibleBloodTypes = COMPATIBLE_DONOR_BLOOD_TYPES[bloodType];
  const radiusKm = DONOR_SEARCH_RADIUS_KM[urgency];

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new AppError('A valid facility longitude and latitude are required', 400);
  }

  if (!compatibleBloodTypes) throw new AppError('A valid blood type is required', 400);
  if (!radiusKm) throw new AppError('Urgency must be standard, urgent, or critical', 400);

  const [result] = await User.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distanceMeters',
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: {
          role: 'donor',
          bloodType: { $in: compatibleBloodTypes },
        },
      },
    },
    { $count: 'estimatedDonors' },
  ]);

  return {
    estimatedDonors: result?.estimatedDonors ?? 0,
    radiusKm,
  };
}

export async function saveUserLocation(userId, token, payload) {
  if (!token) throw new AppError('Location tracking authorization is required', 401);

  const longitude = Number(payload.longitude);
  const latitude = Number(payload.latitude);
  const accuracy = payload.accuracy == null ? undefined : Number(payload.accuracy);

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new AppError('A valid longitude and latitude are required', 400);
  }

  if (accuracy !== undefined && (!Number.isFinite(accuracy) || accuracy < 0)) {
    throw new AppError('Location accuracy must be a positive number', 400);
  }

  const user = await User.findById(userId).select('+locationTrackingTokenHash');

  if (!user) throw new AppError('User not found', 404);
  if (!user.locationTrackingTokenHash) throw new AppError('Location tracking is unavailable', 401);

  const expectedHash = Buffer.from(user.locationTrackingTokenHash, 'hex');
  const suppliedHash = Buffer.from(hashToken(token), 'hex');
  if (expectedHash.length !== suppliedHash.length || !timingSafeEqual(expectedHash, suppliedHash)) {
    throw new AppError('Location tracking authorization is invalid', 401);
  }

  const capturedAt = payload.capturedAt ? new Date(payload.capturedAt) : new Date();
  if (Number.isNaN(capturedAt.getTime()) || capturedAt > new Date(Date.now() + 60_000)) {
    throw new AppError('Location capture time is invalid', 400);
  }

  user.location = {
    type: 'Point',
    coordinates: [longitude, latitude],
    ...(accuracy === undefined ? {} : { accuracy }),
    capturedAt,
  };
  await user.save();

  return user;
}
