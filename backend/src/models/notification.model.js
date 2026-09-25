import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ['donor', 'hospital'],
      required: true,
    },
    type: {
      type: String,
      enum: [
        'blood_request_matched',
        'donor_response_summary',
        'donor_accepted',
        'donor_declined',
        'donor_confirmed',
        'donation_completed',
        'donation_no_show',
        'donor_matching_complete',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
      index: true,
    },
    matchRank: Number,
    readAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

notificationSchema.index(
  { recipientId: 1, requestId: 1, type: 1 },
  { unique: true },
);
notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);