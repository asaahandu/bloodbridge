import { readFile } from 'node:fs/promises';

import OpenAI from 'openai';

import { env } from '../config/env.js';
import { AIResult } from '../models/ai-result.model.js';
import { DonorRequestActivity } from '../models/donor-request-activity.model.js';
import { AppError } from '../utils/app-error.js';

const TRAINING_FILE_URL = new URL('../../bloodbridge_eligibility_training.jsonl', import.meta.url);
const MAX_USER_MESSAGE_LENGTH = 800;
const MAX_SCREENING_MESSAGES = 40;
const TOPICS = [
  'age_weight',
  'current_wellness',
  'recent_illness',
  'medications',
  'chronic_conditions',
  'recent_travel',
  'recent_procedures',
  'pregnancy',
  'last_donation',
  'recent_alcohol',
];

const TOPIC_DESCRIPTIONS = {
  age_weight: 'age and approximate weight',
  current_wellness: 'how the donor feels today, including dizziness, fever, or fatigue',
  recent_illness: 'recent fever, cold, flu, infection, or other illness',
  medications: 'current medication, especially antibiotics',
  chronic_conditions: 'diagnosed or chronic health conditions and relevant current readings',
  recent_travel: 'travel in the last three months, malaria-risk locations, and symptoms after travel',
  recent_procedures: 'tattoos, piercings, acupuncture, surgery, or dental work in the last six months',
  pregnancy: 'whether pregnancy is relevant to the donor at present',
  last_donation: 'the date or approximate time of the donor\'s last blood donation',
  recent_alcohol: 'alcohol use in the last 24 hours and whether the donor is currently intoxicated',
};

const screeningOutputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: {
      type: 'string',
      enum: ['in_progress', 'completed'],
    },
    message: {
      type: 'string',
      description: 'The next concise assistant message shown to the donor.',
    },
    coveredTopics: {
      type: 'array',
      items: { type: 'string', enum: TOPICS },
      description: 'Every required topic that the donor has answered in the conversation.',
    },
    answerSummary: {
      type: 'string',
      description: 'A factual summary of the donor answers. Empty until the screening is completed.',
    },
    reviewFlags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Concise issues for qualified clinical staff to review. Never a diagnosis or decision.',
    },
  },
  required: ['status', 'message', 'coveredTopics', 'answerSummary', 'reviewFlags'],
};

let openAIClient;
let exampleDialoguesPromise;

function getOpenAIClient() {
  if (!env.openai.apiKey) {
    throw new AppError(
      'Eligibility screening is not configured. Add OPENAI_API_KEY to backend/.env.',
      503,
    );
  }

  openAIClient ??= new OpenAI({
    apiKey: env.openai.apiKey,
    maxRetries: 1,
    timeout: 30_000,
  });
  return openAIClient;
}

async function loadExampleDialogues() {
  exampleDialoguesPromise ??= readFile(TRAINING_FILE_URL, 'utf8').then((contents) =>
    contents
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line, index) => {
        try {
          const example = JSON.parse(line);
          const messages = Array.isArray(example.messages) ? example.messages : [];
          const userMessage = messages.find((message) => message.role === 'user')?.content;
          const assistantMessage = messages.find((message) => message.role === 'assistant')?.content;
          if (!userMessage || !assistantMessage) throw new Error('Missing user or assistant message');
          return `Example ${index + 1}\nDonor: ${userMessage}\nAssistant: ${assistantMessage}`;
        } catch (error) {
          throw new Error(`Invalid eligibility training example on line ${index + 1}`, {
            cause: error,
          });
        }
      })
      .join('\n\n'),
  );

  try {
    return await exampleDialoguesPromise;
  } catch (error) {
    exampleDialoguesPromise = undefined;
    console.error('Unable to load eligibility training examples', error);
    throw new AppError('Eligibility screening examples could not be loaded.', 503);
  }
}

function buildInstructions(exampleDialogues, coveredTopics) {
  const topicList = TOPICS.map(
    (topic) => `- ${topic}: ${TOPIC_DESCRIPTIONS[topic]}`,
  ).join('\n');

  return [
    'You are BloodBridge\'s donor eligibility pre-screening assistant.',
    'Conduct a respectful, concise interview one question at a time. Follow the tone, safety boundary, and subject coverage in the reference dialogues below.',
    'This is only an initial pre-screen. Never say that a donor is eligible, approved, ineligible, rejected, safe, or unsafe to donate. Never diagnose. Qualified clinical staff make the final decision after an in-person check.',
    'Acknowledge concerning answers neutrally, add a clear review flag, and continue the interview unless the donor asks to stop.',
    'Do not ask for names, phone numbers, addresses, patient details, or other identifying information.',
    'Ask follow-up questions only when needed to accurately summarize an answer. Keep the visible message under 120 words.',
    'Treat pregnancy as a neutral applicability question; allow "not applicable" without asking why.',
    'Only set status to completed after every required topic has an answer, including "unknown", "not applicable", or "prefer not to answer". When complete, give a factual answer summary, list issues for staff review, and remind the donor that this is not a final eligibility decision.',
    'On every turn, coveredTopics and reviewFlags must reflect the entire conversation so far, not only the latest answer.',
    `Topics already recorded by the server: ${coveredTopics.length ? coveredTopics.join(', ') : 'none'}.`,
    `Required topics:\n${topicList}`,
    `Reference dialogues from bloodbridge_eligibility_training.jsonl:\n${exampleDialogues}`,
  ].join('\n\n');
}

function mapOpenAIError(error) {
  if (!(error instanceof OpenAI.APIError)) {
    return new AppError('Eligibility screening is temporarily unavailable. Please try again.', 503);
  }
  if (error.status === 429 || (error.status && error.status >= 500)) {
    return new AppError('Eligibility screening is temporarily busy. Please try again.', 503);
  }
  if (error.status === 401 || error.status === 403) {
    return new AppError('Eligibility screening could not authenticate with the AI provider.', 503);
  }
  return new AppError('Eligibility screening could not process this answer.', 502);
}

function validateModelOutput(value) {
  const statusIsValid = ['in_progress', 'completed'].includes(value?.status);
  const topicsAreValid =
    Array.isArray(value?.coveredTopics) &&
    value.coveredTopics.every((topic) => TOPICS.includes(topic));
  const flagsAreValid =
    Array.isArray(value?.reviewFlags) &&
    value.reviewFlags.every((flag) => typeof flag === 'string');

  if (
    !statusIsValid ||
    typeof value?.message !== 'string' ||
    !value.message.trim() ||
    !topicsAreValid ||
    typeof value?.answerSummary !== 'string' ||
    !flagsAreValid
  ) {
    throw new AppError('Eligibility screening returned an invalid response.', 502);
  }
  if (value.status === 'completed' && !value.answerSummary.trim()) {
    throw new AppError('Eligibility screening returned an incomplete answer summary.', 502);
  }

  return {
    status: value.status,
    message: value.message.trim(),
    coveredTopics: [...new Set(value.coveredTopics)],
    answerSummary: value.answerSummary.trim(),
    reviewFlags: [...new Set(value.reviewFlags.map((flag) => flag.trim()).filter(Boolean))],
  };
}

async function generateScreeningTurn(messages, coveredTopics) {
  const client = getOpenAIClient();
  const exampleDialogues = await loadExampleDialogues();
  const input = messages.length
    ? messages.map(({ role, content }) => ({ role, content }))
    : [
        {
          role: 'user',
          content:
            'Begin my request-specific donor eligibility pre-screening now. Introduce the purpose briefly and ask the first question.',
        },
      ];

  try {
    const response = await client.responses.create({
      model: env.openai.chatModel,
      store: false,
      max_output_tokens: 900,
      instructions: buildInstructions(exampleDialogues, coveredTopics),
      input,
      text: {
        format: {
          type: 'json_schema',
          name: 'donor_eligibility_screening_turn',
          strict: true,
          schema: screeningOutputSchema,
        },
      },
    });

    if (!response.output_text) {
      throw new AppError('Eligibility screening returned an empty response.', 502);
    }
    return validateModelOutput(JSON.parse(response.output_text));
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof SyntaxError) {
      throw new AppError('Eligibility screening returned an invalid response.', 502);
    }
    throw mapOpenAIError(error);
  }
}

async function getAcceptedActivity(requestId, donorId) {
  const activity = await DonorRequestActivity.findOne({ requestId, donorId });
  if (!activity) throw new AppError('This donor was not notified about the request', 403);
  if (activity.decision !== 'accepted') {
    throw new AppError('Accept this blood request before starting eligibility screening', 409);
  }
  return activity;
}

function serializeResult(result) {
  return {
    id: String(result._id),
    requestId: String(result.requestId),
    status: result.status,
    messages: result.messages.map((message) => ({
      id: String(message._id),
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
    coveredTopics: result.coveredTopics,
    answerSummary: result.answerSummary ?? '',
    reviewFlags: result.reviewFlags,
    ...(result.completedAt ? { completedAt: result.completedAt } : {}),
  };
}

export async function startEligibilityScreening(requestId, donor) {
  const activity = await getAcceptedActivity(requestId, donor._id);
  const existingResult = await AIResult.findOne({ requestId, donorId: donor._id });
  if (existingResult) return serializeResult(existingResult);

  const turn = await generateScreeningTurn([], []);
  try {
    const result = await AIResult.create({
      requestId,
      hospitalId: activity.hospitalId,
      donorId: donor._id,
      status: 'in_progress',
      messages: [{ role: 'assistant', content: turn.message }],
      coveredTopics: [],
      model: env.openai.chatModel,
    });
    return serializeResult(result);
  } catch (error) {
    if (error?.code === 11000) {
      const result = await AIResult.findOne({ requestId, donorId: donor._id });
      if (result) return serializeResult(result);
    }
    throw error;
  }
}

export async function answerEligibilityScreening(requestId, donor, messageInput) {
  await getAcceptedActivity(requestId, donor._id);
  const message = typeof messageInput === 'string' ? messageInput.trim() : '';
  if (!message) throw new AppError('A screening answer is required', 400);
  if (message.length > MAX_USER_MESSAGE_LENGTH) {
    throw new AppError(`Screening answers cannot exceed ${MAX_USER_MESSAGE_LENGTH} characters`, 400);
  }

  const result = await AIResult.findOne({ requestId, donorId: donor._id });
  if (!result) throw new AppError('Start the eligibility screening before answering', 409);
  if (result.status === 'completed') {
    throw new AppError('This eligibility screening has already been completed', 409);
  }
  if (result.messages.length >= MAX_SCREENING_MESSAGES - 1) {
    throw new AppError('This screening is too long. Please ask hospital staff to continue.', 409);
  }

  const conversation = [
    ...result.messages.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: message },
  ];
  let turn = await generateScreeningTurn(conversation, result.coveredTopics);
  let coveredTopics = [...new Set([...result.coveredTopics, ...turn.coveredTopics])];
  let allTopicsCovered = TOPICS.every((topic) => coveredTopics.includes(topic));

  if (turn.status === 'completed' && !allTopicsCovered) {
    const correctionPrompt = {
      role: 'user',
      content:
        'Server check: required topics are still missing. Re-read the conversation, return the full coveredTopics list, and ask one concise question for the next genuinely unanswered topic. Do not complete the screening yet.',
    };
    turn = await generateScreeningTurn(
      [...conversation, { role: 'assistant', content: turn.message }, correctionPrompt],
      coveredTopics,
    );
    coveredTopics = [...new Set([...coveredTopics, ...turn.coveredTopics])];
    allTopicsCovered = TOPICS.every((topic) => coveredTopics.includes(topic));
  }

  if (turn.status === 'completed' && !allTopicsCovered) {
    throw new AppError('Eligibility screening tried to finish before all topics were covered.', 502);
  }

  result.messages.push({ role: 'user', content: message });
  result.messages.push({ role: 'assistant', content: turn.message });
  result.coveredTopics = coveredTopics;
  result.reviewFlags = turn.reviewFlags;
  result.model = env.openai.chatModel;

  if (turn.status === 'completed' && allTopicsCovered) {
    result.status = 'completed';
    result.answerSummary = turn.answerSummary;
    result.completedAt = new Date();
  }

  await result.save();
  return serializeResult(result);
}
