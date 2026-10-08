import mongoose from 'mongoose';

const supportConversationSchema = new mongoose.Schema(
  {
    userId: {
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
      enum: ['user', 'support'],
    },
  },
  { timestamps: true, versionKey: false },
);

supportConversationSchema.index({ userId: 1 }, { unique: true });
supportConversationSchema.index({ lastMessageAt: -1 });

export const SupportConversation = mongoose.model(
  'SupportConversation',
  supportConversationSchema,
);
