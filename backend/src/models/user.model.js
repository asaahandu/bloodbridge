import mongoose from 'mongoose';

import { DONOR_BLOOD_TYPES } from '../constants/blood-types.js';

export const USER_GENDERS = ['female', 'male', 'non-binary', 'prefer-not-to-say'];
export const USER_ROLES = ['donor', 'hospital'];

const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(coordinates) {
          return (
            coordinates.length === 2 &&
            Number.isFinite(coordinates[0]) &&
            Number.isFinite(coordinates[1]) &&
            coordinates[0] >= -180 &&
            coordinates[0] <= 180 &&
            coordinates[1] >= -90 &&
            coordinates[1] <= 90
          );
        },
        message: 'Location coordinates must contain a valid longitude and latitude',
      },
    },
    accuracy: {
      type: Number,
      min: [0, 'Location accuracy cannot be negative'],
    },
    capturedAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false },
);

const notificationPreferencesSchema = new mongoose.Schema(
  {
    pushEnabled: {
      type: Boolean,
      default: true,
    },
    emailEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const expoPushTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ['android', 'ios'],
      required: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: false },
);

const donationProfileSchema = new mongoose.Schema(
  {
    lastDonationAt: Date,
    availabilityPreset: {
      type: String,
      enum: ['anytime', 'weekdays', 'weekends', 'daytime', 'evenings'],
      default: 'anytime',
    },
    maxTravelDistanceKm: {
      type: Number,
      enum: [10, 25, 50],
      default: 25,
    },
  },
  { _id: false },
);

const authSessionSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must contain at least 2 characters'],
      maxlength: [160, 'Full name cannot exceed 160 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      validate: {
        validator(value) {
          return value.replace(/\D/g, '').length >= 8;
        },
        message: 'Enter a valid phone number',
      },
    },
    dateOfBirth: {
      type: Date,
      required() {
        return this.role === 'donor';
      },
      validate: {
        validator(value) {
          return value.getUTCFullYear() >= 1900 && value < new Date();
        },
        message: 'Date of birth must be a valid past date',
      },
    },
    gender: {
      type: String,
      enum: USER_GENDERS,
      required() {
        return this.role === 'donor';
      },
    },
    cityRegion: {
      type: String,
      required: [true, 'City or region is required'],
      trim: true,
      minlength: [2, 'City or region must contain at least 2 characters'],
      maxlength: [120, 'City or region cannot exceed 120 characters'],
      index: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: [true, 'Role is required'],
      index: true,
    },
    bloodType: {
      type: String,
      enum: DONOR_BLOOD_TYPES,
      required() {
        return this.role === 'donor';
      },
      index: true,
    },
    receivesAlerts: {
      type: Boolean,
      required() {
        return this.role === 'donor';
      },
      validate: {
        validator(value) {
          return this.role !== 'donor' || value === true;
        },
        message: 'Alert and notification consent is required',
      },
    },
    donationProfile: {
      type: donationProfileSchema,
      default() {
        return this.role === 'donor'
          ? { availabilityPreset: 'anytime', maxTravelDistanceKm: 25 }
          : undefined;
      },
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({ pushEnabled: true, emailEnabled: true }),
    },
    expoPushTokens: {
      type: [expoPushTokenSchema],
      default: [],
    },
    termsAcceptedAt: {
      type: Date,
      required: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    location: {
      type: locationSchema,
      default: undefined,
    },
    locationTrackingTokenHash: {
      type: String,
      select: false,
    },
    authTokenHash: {
      type: String,
      select: false,
      index: true,
    },
    authSessions: {
      type: [authSessionSchema],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_document, result) {
        delete result.passwordHash;
        delete result.locationTrackingTokenHash;
        delete result.authTokenHash;
        delete result.authSessions;
        return result;
      },
    },
  },
);

userSchema.index({ location: '2dsphere' });
userSchema.index({ 'authSessions.tokenHash': 1 });

export const User = mongoose.model('User', userSchema);
