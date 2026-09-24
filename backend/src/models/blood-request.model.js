import mongoose from 'mongoose';

import { BLOOD_TYPES } from '../constants/blood-types.js';

const bloodRequestSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Hospital account is required'],
      index: true,
    },
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
    internalReference: {
      type: String,
      required: [true, 'Internal reference is required'],
      trim: true,
      maxlength: [100, 'Internal reference cannot exceed 100 characters'],
    },
    ward: {
      type: String,
      trim: true,
      maxlength: [120, 'Ward or department cannot exceed 120 characters'],
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
      trim: true,
    },
    facilityLocation: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      accuracy: {
        type: Number,
        min: 0,
      },
    },
    rewardAmount: {
      type: Number,
      min: [0, 'Proposed reward cannot be negative'],
      max: [999999999, 'Proposed reward is too large'],
    },
    rewardCurrency: {
      type: String,
      enum: ['XAF'],
      required() {
        return this.rewardAmount != null;
      },
    },
    neededBy: {
      type: Date,
      required: [true, 'Needed-by date is required'],
      validate: {
        validator(value) {
          return value > new Date();
        },
        message: 'Needed-by date must be in the future',
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

bloodRequestSchema.index({ status: 1, bloodType: 1, city: 1, createdAt: -1 });
bloodRequestSchema.index({ hospitalId: 1, status: 1, createdAt: -1 });
bloodRequestSchema.index({ facilityLocation: '2dsphere' });

export const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);
