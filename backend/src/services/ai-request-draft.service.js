import OpenAI from 'openai';

import { env } from '../config/env.js';
import { BLOOD_TYPES } from '../constants/blood-types.js';
import { AppError } from '../utils/app-error.js';

const URGENCY_LEVELS = ['standard', 'urgent', 'critical'];
const MISSING_FIELD_NAMES = ['bloodType', 'unitsNeeded', 'urgency', 'internalReference'];

const requestDraftSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    bloodType: { type: ['string', 'null'], enum: [...BLOOD_TYPES, null] },
    unitsNeeded: { type: ['integer', 'null'] },
    urgency: { type: ['string', 'null'], enum: [...URGENCY_LEVELS, null] },
    internalReference: { type: ['string', 'null'] },
    ward: { type: ['string', 'null'] },
    rewardAmount: { type: ['integer', 'null'] },
    missingFields: {
      type: 'array',
      items: { type: 'string', enum: MISSING_FIELD_NAMES },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
  },
  required: [
    'bloodType',
    'unitsNeeded',
    'urgency',
    'internalReference',
    'ward',
    'rewardAmount',
    'missingFields',
    'warnings',
    'confidence',
  ],
};

let openAIClient;

function getOpenAIClient() {
  if (!env.openai.apiKey) {
    throw new AppError(
      'AI request drafting is not configured. Add OPENAI_API_KEY to backend/.env.',
      503,
    );
  }

  openAIClient ??= new OpenAI({ apiKey: env.openai.apiKey });
  return openAIClient;
}

function sanitizeDescription(value) {
  if (typeof value !== 'string') {
    throw new AppError('Description must be a string', 400);
  }

  const description = value.trim();
  if (description.length < 12) {
    throw new AppError('Describe the blood request in at least 12 characters', 400);
  }
  if (description.length > 800) {
    throw new AppError('Description cannot exceed 800 characters', 400);
  }

  return description
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted email]')
    .replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, '[redacted number]');
}

function normalizeOptionalString(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeDraft(value) {
  const warnings = Array.isArray(value?.warnings)
    ? value.warnings
        .filter((warning) => typeof warning === 'string' && warning.trim())
        .map((warning) => warning.trim().slice(0, 160))
        .slice(0, 4)
    : [];
  const unitsNeeded =
    Number.isInteger(value?.unitsNeeded) && value.unitsNeeded >= 1 && value.unitsNeeded <= 20
      ? value.unitsNeeded
      : null;
  const rewardAmount =
    Number.isInteger(value?.rewardAmount) &&
    value.rewardAmount >= 0 &&
    value.rewardAmount <= 999999999
      ? value.rewardAmount
      : null;

  if (value?.unitsNeeded != null && unitsNeeded == null) {
    warnings.push('The extracted unit count was outside the supported range of 1 to 20.');
  }
  if (value?.rewardAmount != null && rewardAmount == null) {
    warnings.push('The extracted reward amount was outside the supported range.');
  }

  const draft = {
    bloodType: BLOOD_TYPES.includes(value?.bloodType) ? value.bloodType : null,
    unitsNeeded,
    urgency: URGENCY_LEVELS.includes(value?.urgency) ? value.urgency : null,
    internalReference: normalizeOptionalString(value?.internalReference, 100),
    ward: normalizeOptionalString(value?.ward, 120),
    rewardAmount,
  };
  const missingFields = MISSING_FIELD_NAMES.filter((field) => draft[field] == null);

  return {
    ...draft,
    missingFields,
    warnings: warnings.slice(0, 4),
    confidence: ['low', 'medium', 'high'].includes(value?.confidence) ? value.confidence : 'low',
  };
}

function parseDraft(outputText) {
  if (!outputText) {
    throw new AppError('The AI service did not return a request draft', 502);
  }

  try {
    return normalizeDraft(JSON.parse(outputText));
  } catch {
    throw new AppError('The AI service returned an invalid request draft', 502);
  }
}

export async function draftBloodRequest(descriptionInput) {
  const description = sanitizeDescription(descriptionInput);
  const client = getOpenAIClient();

  try {
    const response = await client.responses.create({
      model: env.openai.requestDraftModel,
      store: false,
      max_output_tokens: 600,
      instructions: [
        'You extract fields for a hospital blood request draft in BloodBridge.',
        'Only use facts explicitly present in the staff description. Never invent a blood type, unit count, ward, reference, reward, or urgency.',
        'Map routine or non-urgent language to standard, urgent language to urgent, and immediate or life-threatening language to critical.',
        'Do not provide medical advice, donor eligibility decisions, blood compatibility advice, or patient diagnoses.',
        'An internal reference is an operational case label supplied by staff; do not use a patient name as the reference.',
        'List every absent required field in missingFields. Put ambiguity or safety concerns in warnings.',
      ].join(' '),
      input: description,
      text: {
        format: {
          type: 'json_schema',
          name: 'blood_request_draft',
          description: 'A reviewable draft for the BloodBridge hospital request form.',
          strict: true,
          schema: requestDraftSchema,
        },
      },
    });

    return parseDraft(response.output_text);
  } catch (error) {
    if (error instanceof AppError) throw error;

    if (error instanceof OpenAI.APIError) {
      const statusCode = error.status === 429 ? 503 : 502;
      throw new AppError(
        statusCode === 503
          ? 'AI request drafting is temporarily busy. Please try again.'
          : 'AI request drafting could not process this description.',
        statusCode,
      );
    }

    throw error;
  }
}
