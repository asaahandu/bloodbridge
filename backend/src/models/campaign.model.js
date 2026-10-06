import mongoose from 'mongoose';

const campaignImageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 255 },
    mimeType: { type: String, enum: ['image/jpeg', 'image/png'], required: true },
    size: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
    content: { type: Buffer, required: true, select: false },
  },
  { _id: false },
);

const campaignSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hospitalName: { type: String, required: true, trim: true, maxlength: 160 },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    images: {
      type: [campaignImageSchema],
      default: [],
      validate: {
        validator(images) {
          return images.length <= 5;
        },
        message: 'Attach no more than five images',
      },
    },
  },
  { timestamps: true, versionKey: false },
);

campaignSchema.index({ date: 1, createdAt: -1 });
campaignSchema.index({ hospitalId: 1, createdAt: -1 });

export const Campaign = mongoose.model('Campaign', campaignSchema);