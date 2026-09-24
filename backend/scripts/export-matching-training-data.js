import mongoose from 'mongoose';

import { env } from '../src/config/env.js';
import { DonorRequestActivity } from '../src/models/donor-request-activity.model.js';
import { User } from '../src/models/user.model.js';

async function exportTrainingData() {
  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDb,
    maxPoolSize: 3,
    serverSelectionTimeoutMS: 30_000,
  });

  let exportedCount = 0;
  if (process.argv.includes('--summary')) {
    const [donors, activities, rankedSnapshots, labelledExamples] = await Promise.all([
      User.countDocuments({ role: 'donor' }),
      DonorRequestActivity.countDocuments(),
      DonorRequestActivity.countDocuments({ matchingFeatures: { $exists: true } }),
      DonorRequestActivity.countDocuments({
        matchingFeatures: { $exists: true },
        $or: [
          { outcome: { $in: ['completed', 'no_show'] } },
          { decision: 'declined' },
        ],
      }),
    ]);
    console.log(JSON.stringify({ donors, activities, rankedSnapshots, labelledExamples }));
    return;
  }

  const groupByRequest = new Map();
  const cursor = DonorRequestActivity.find({
    matchingFeatures: { $exists: true },
    $or: [
      { outcome: { $in: ['completed', 'no_show'] } },
      { decision: 'declined' },
    ],
  })
    .select('requestId matchingModelVersion matchingFeatures decision outcome')
    .lean()
    .cursor();

  for await (const activity of cursor) {
    const positive = activity.outcome === 'completed';
    const sampleWeight = activity.outcome ? 1 : 0.6;
    const requestKey = String(activity.requestId);
    if (!groupByRequest.has(requestKey)) {
      groupByRequest.set(requestKey, `request-${groupByRequest.size + 1}`);
    }

    process.stdout.write(
      `${JSON.stringify({
        features: activity.matchingFeatures,
        label: positive ? 1 : 0,
        sampleWeight,
        groupId: groupByRequest.get(requestKey),
        sourceModelVersion: activity.matchingModelVersion,
      })}\n`,
    );
    exportedCount += 1;
  }

  console.error(`Exported ${exportedCount} de-identified matching training examples.`);
}

try {
  await exportTrainingData();
} finally {
  await mongoose.disconnect();
}
