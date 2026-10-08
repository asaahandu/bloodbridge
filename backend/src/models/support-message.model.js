import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportConversation',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    senderRole: {
      type: String,
      enum: ['user', 'support'],
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2_000,
    },
  },
  { timestamps: true, versionKey: false },
);

supportMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const SupportMessage = mongoose.model('SupportMessage', supportMessageSchema);
