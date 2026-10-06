import mongoose from 'mongoose';

const kycDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 255 },
    mimeType: {
      type: String,
      enum: ['application/pdf', 'image/jpeg', 'image/png'],
      required: true,
    },
    size: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
    content: { type: Buffer, required: true, select: false },
  },
  { _id: false },
);

const kycRequestSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    hospitalName: { type: String, required: true, trim: true, maxlength: 160 },
    documents: {
      type: [kycDocumentSchema],
      required: true,
      validate: {
        validator(documents) {
          return documents.length >= 1 && documents.length <= 5;
        },
        message: 'Attach between one and five documents',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'rejected', 'verified'],
      default: 'pending',
      index: true,
    },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

export const KycRequest = mongoose.model('KycRequest', kycRequestSchema);