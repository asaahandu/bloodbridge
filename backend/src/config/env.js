import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

const envFilePath = fileURLToPath(new URL('../../.env', import.meta.url));
config({ path: envFilePath, quiet: true });

const requiredVariables = ['MONGODB_DB', 'MONGODB_URI'];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVariables.join(', ')}. ` +
      'Copy backend/.env.example to backend/.env and add your MongoDB connection string.',
  );
}

const parsedPort = Number.parseInt(process.env.PORT ?? '4000', 10);
const donationMinimumIntervalDays = Number.parseInt(
  process.env.DONATION_MIN_INTERVAL_DAYS ?? '112',
  10,
);
const matchingAverageTravelSpeedKmh = Number.parseInt(
  process.env.MATCHING_AVERAGE_TRAVEL_SPEED_KMH ?? '25',
  10,
);
const smtpHost = process.env.SMTP_HOST?.trim();
const smtpPort = Number.parseInt(process.env.SMTP_PORT ?? '587', 10);
const smtpSecure = (process.env.SMTP_SECURE ?? 'false').trim().toLowerCase() === 'true';
const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS?.trim();
const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const openaiRequestDraftModel = process.env.OPENAI_REQUEST_DRAFT_MODEL?.trim() || 'gpt-5.4-mini';
const openaiChatModel = process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-5.4-mini';

if (Number.isNaN(parsedPort)) {
  throw new Error('PORT must be a valid number');
}

if (
  !Number.isInteger(donationMinimumIntervalDays) ||
  donationMinimumIntervalDays < 28 ||
  donationMinimumIntervalDays > 365
) {
  throw new Error('DONATION_MIN_INTERVAL_DAYS must be an integer between 28 and 365');
}

if (
  !Number.isInteger(matchingAverageTravelSpeedKmh) ||
  matchingAverageTravelSpeedKmh < 5 ||
  matchingAverageTravelSpeedKmh > 120
) {
  throw new Error('MATCHING_AVERAGE_TRAVEL_SPEED_KMH must be an integer between 5 and 120');
}

if (Number.isNaN(smtpPort)) {
  throw new Error('SMTP_PORT must be a valid number');
}

const hasSmtpConfig = Boolean(smtpHost || smtpUser || smtpPass || process.env.SMTP_SECURE);
if (hasSmtpConfig && (!smtpHost || !smtpUser || !smtpPass)) {
  throw new Error('Gmail SMTP email requires SMTP_HOST, SMTP_USER, and SMTP_PASS to be configured together.');
}

export const env = Object.freeze({
  clientOrigins: (process.env.CLIENT_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  mongodbDb: process.env.MONGODB_DB,
  mongodbUri: process.env.MONGODB_URI,
  donationMinimumIntervalDays,
  matchingAverageTravelSpeedKmh,
  matchingTimeZone: process.env.MATCHING_TIME_ZONE?.trim() || 'Africa/Douala',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsedPort,
  expoPushAccessToken: process.env.EXPO_PUSH_ACCESS_TOKEN?.trim(),
  smtp: Object.freeze({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    user: smtpUser,
    pass: smtpPass,
  }),
  openai: Object.freeze({
    apiKey: openaiApiKey,
    chatModel: openaiChatModel,
    requestDraftModel: openaiRequestDraftModel,
  }),
});
