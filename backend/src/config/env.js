import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

const envFilePath = fileURLToPath(new URL('../../.env', import.meta.url));
config({ path: envFilePath });

const requiredVariables = ['MONGODB_DB', 'MONGODB_URI'];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVariables.join(', ')}. ` +
      'Copy backend/.env.example to backend/.env and add your MongoDB connection string.',
  );
}

const parsedPort = Number.parseInt(process.env.PORT ?? '4000', 10);

if (Number.isNaN(parsedPort)) {
  throw new Error('PORT must be a valid number');
}

export const env = Object.freeze({
  clientOrigins: (process.env.CLIENT_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  mongodbDb: process.env.MONGODB_DB,
  mongodbUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsedPort,
});
