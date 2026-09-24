import OpenAI from 'openai';

import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

const MAX_MESSAGES = 12;
const MAX_USER_MESSAGE_LENGTH = 800;
const MAX_ASSISTANT_MESSAGE_LENGTH = 2_400;
const MAX_CONVERSATION_LENGTH = 12_000;
const ALLOWED_ROLES = new Set(['user', 'assistant']);

let openAIClient;

function getOpenAIClient() {
  if (!env.openai.apiKey) {
    throw new AppError(
      'AI chat is not configured. Add OPENAI_API_KEY to backend/.env.',
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

function sanitizeMessages(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError('At least one chat message is required', 400);
  }

  if (value.length > MAX_MESSAGES) {
    throw new AppError(`Chat history cannot exceed ${MAX_MESSAGES} messages`, 400);
  }

  let totalLength = 0;
  const messages = value.map((message) => {
    if (!message || !ALLOWED_ROLES.has(message.role) || typeof message.content !== 'string') {
      throw new AppError('Every chat message must have a valid role and text content', 400);
    }

    const content = message.content.trim();
    if (!content) throw new AppError('Chat messages cannot be empty', 400);
    const maxLength =
      message.role === 'user' ? MAX_USER_MESSAGE_LENGTH : MAX_ASSISTANT_MESSAGE_LENGTH;
    if (content.length > maxLength) {
      throw new AppError(`This ${message.role} message is too long for the chat history`, 400);
    }

    totalLength += content.length;
    return { role: message.role, content };
  });

  if (messages.at(-1)?.role !== 'user') {
    throw new AppError('The latest chat message must be from the user', 400);
  }
  if (totalLength > MAX_CONVERSATION_LENGTH) {
    throw new AppError('The chat history is too long. Start a new conversation.', 400);
  }

  return messages;
}

function buildInstructions(role) {
  const roleGuidance =
    role === 'hospital'
      ? 'Help hospital staff clarify operational notes, draft non-clinical request language, summarize user-provided details, and prepare donor outreach.'
      : 'Help donors understand BloodBridge app workflows, summarize user-provided request wording, and prepare questions for hospital staff.';

  return [
    `You are BloodBridge AI, a concise in-app assistant for an authenticated ${role} account.`,
    roleGuidance,
    'Use only details from the conversation. You do not have access to the BloodBridge database, live request records, user location, or external systems, and you must never imply that you do.',
    'Do not diagnose, prescribe treatment, determine donor eligibility, give blood-compatibility instructions, or make emergency-care decisions.',
    'When a question requires clinical judgment or concerns an emergency, clearly direct the user to qualified medical staff or local emergency services.',
    'Protect privacy: discourage sharing patient names, phone numbers, email addresses, or other identifying medical information.',
    'Keep answers practical and brief. State uncertainty plainly and do not invent BloodBridge features or records.',
  ].join(' ');
}

function mapOpenAIError(error) {
  if (!(error instanceof OpenAI.APIError)) {
    return new AppError('AI chat is temporarily unavailable. Please try again.', 503);
  }

  if (error.status === 429 && error.code === 'insufficient_quota') {
    return new AppError('AI chat is unavailable because its usage limit has been reached.', 503);
  }
  if (error.status === 429 || (error.status && error.status >= 500)) {
    return new AppError('AI chat is temporarily busy. Please try again.', 503);
  }
  if (error.status === 401 || error.status === 403) {
    return new AppError('AI chat could not authenticate with the AI provider.', 503);
  }

  return new AppError('AI chat could not process this message.', 502);
}

export async function createChatReply(messagesInput, accountRole) {
  if (!['donor', 'hospital'].includes(accountRole)) {
    throw new AppError('AI chat is not available for this account role', 403);
  }

  const messages = sanitizeMessages(messagesInput);
  const client = getOpenAIClient();

  try {
    const response = await client.responses.create({
      model: env.openai.chatModel,
      store: false,
      max_output_tokens: 500,
      instructions: buildInstructions(accountRole),
      input: messages,
    });
    const message = response.output_text?.trim();

    if (!message) throw new AppError('The AI service returned an empty response', 502);
    return { message };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapOpenAIError(error);
  }
}
