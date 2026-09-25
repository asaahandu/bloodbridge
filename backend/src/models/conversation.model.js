import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastMessageBody: {
      type: String,
      maxlength: 2_000,
    },
    lastMessageAt: Date,
    lastMessageSenderRole: {
      type: String,
      enum: ['donor', 'hospital'],
    },
  },
  { timestamps: true, versionKey: false },
);

conversationSchema.index({ requestId: 1, donorId: 1 }, { unique: true });
conversationSchema.index({ hospitalId: 1, lastMessageAt: -1 });
conversationSchema.index({ donorId: 1, lastMessageAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);