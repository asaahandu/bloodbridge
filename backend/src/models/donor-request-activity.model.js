import mongoose from 'mongoose';

const matchingFeaturesSchema = new mongoose.Schema(
  {
    exactBloodType: Number,
    bloodCompatibility: Number,
    distanceKm: Number,
    distanceScore: Number,
    donationIntervalVerified: Number,
    availabilityScore: Number,
    historicalAcceptanceRate: Number,
    historicalCompletionRate: Number,
    successfulDonations: Number,
    urgency: {
      type: String,
      enum: ['standard', 'urgent', 'critical'],
    },
  },
  { _id: false },
);

const donorRequestActivitySchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
      index: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    notifiedAt: {
      type: Date,
      required: true,
    },
    readAt: Date,
    pushStatus: {
      type: String,
      enum: ['processing', 'queued', 'skipped', 'failed'],
    },
    pushTicketIds: {
      type: [String],
      default: undefined,
    },
    pushError: {
      type: String,
      maxlength: 500,
    },
    emailStatus: {
      type: String,
      enum: ['processing', 'sent', 'skipped', 'failed'],
    },
    emailSentAt: Date,
    emailError: {
      type: String,
      maxlength: 500,
    },
    decision: {
      type: String,
      enum: ['accepted', 'declined'],
    },
    respondedAt: Date,
    confirmedAt: Date,
    matchRank: Number,
    matchPercentage: Number,
    matchingModelVersion: String,
    matchingFeatures: {
      type: matchingFeaturesSchema,
      default: undefined,
    },
    matchingReasons: {
      type: [String],
      default: undefined,
    },
    matchedAt: Date,
    outcome: {
      type: String,
      enum: ['completed', 'no_show'],
    },
    outcomeRecordedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

donorRequestActivitySchema.index({ requestId: 1, donorId: 1 }, { unique: true });
donorRequestActivitySchema.index({ donorId: 1, notifiedAt: -1 });
donorRequestActivitySchema.index({ requestId: 1, respondedAt: -1 });

export const DonorRequestActivity = mongoose.model(
  'DonorRequestActivity',
  donorRequestActivitySchema,
);
