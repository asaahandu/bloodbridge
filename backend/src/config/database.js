import mongoose from 'mongoose';

import { env } from './env.js';

export async function connectDatabase() {
  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
  });

  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDb,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30_000,
  });

  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
