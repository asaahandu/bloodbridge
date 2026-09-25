import mongoose from 'mongoose';

const screeningMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2_400,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: true },
);

const aiResultSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'skipped'],
      default: 'in_progress',
      required: true,
    },
    messages: {
      type: [screeningMessageSchema],
      default: [],
    },
    coveredTopics: {
      type: [String],
      default: [],
    },
    answerSummary: {
      type: String,
      trim: true,
      maxlength: 6_000,
    },
    reviewFlags: {
      type: [String],
      default: [],
    },
    model: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    completedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

aiResultSchema.index({ requestId: 1, donorId: 1 }, { unique: true });
aiResultSchema.index({ hospitalId: 1, createdAt: -1 });

// The explicit third argument keeps the collection name exactly as requested.
export const AIResult = mongoose.model('AIResult', aiResultSchema, 'AIresult');
