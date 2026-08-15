import mongoose from 'mongoose';

import { BLOOD_TYPES } from './donor.model.js';

const bloodRequestSchema = new mongoose.Schema(
  {
    hospitalName: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
    },
    bloodType: {
      type: String,
      enum: BLOOD_TYPES,
      required: [true, 'Blood type is required'],
      index: true,
    },
    unitsNeeded: {
      type: Number,
      required: [true, 'Units needed is required'],
      min: [1, 'At least one unit is required'],
    },
    urgency: {
      type: String,
      enum: ['standard', 'urgent', 'critical'],
      default: 'urgent',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'fulfilled', 'cancelled'],
      default: 'active',
      index: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    address: {
      type: String,
      required: [true, 'Hospital address is required'],
      trim: true,
    },
    neededBy: {
      type: Date,
      required: [true, 'Needed-by date is required'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

bloodRequestSchema.index({ status: 1, bloodType: 1, city: 1, createdAt: -1 });

export const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);
