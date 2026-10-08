import mongoose from 'mongoose';

import { SupportConversation } from '../models/support-conversation.model.js';
import { SupportMessage } from '../models/support-message.model.js';
import { AppError } from '../utils/app-error.js';

const MAX_MESSAGE_LENGTH = 2_000;
const MESSAGE_HISTORY_LIMIT = 200;

function serializeMessage(message) {
  return {
    id: String(message._id),
    conversationId: String(message.conversationId),
    senderId: message.senderId ? String(message.senderId) : null,
    senderRole: message.senderRole,
    body: message.body,
    createdAt: message.createdAt,
  };
}

function normalizeBody(body) {
  const normalizedBody = typeof body === 'string' ? body.trim() : '';
  if (!normalizedBody) throw new AppError('Message cannot be empty', 400);
  if (normalizedBody.length > MAX_MESSAGE_LENGTH) {
    throw new AppError('Message is too long', 400);
  }
  return normalizedBody;
}

async function findOrCreateConversation(userId) {
  return SupportConversation.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

function serializeConversation(conversation) {
  return {
    id: String(conversation._id),
    userId: String(conversation.userId._id ?? conversation.userId),
    userName: conversation.userId.fullName,
    userEmail: conversation.userId.email,
    userRole: conversation.userId.role,
    lastMessageBody: conversation.lastMessageBody ?? '',
    lastMessageAt: conversation.lastMessageAt ?? conversation.createdAt,
  };
}

export async function getUserSupportConversation(user) {
  const conversation = await findOrCreateConversation(user._id);
  const messages = await SupportMessage.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .limit(MESSAGE_HISTORY_LIMIT)
    .lean();

  return {
    conversationId: String(conversation._id),
    messages: messages.map(serializeMessage),
  };
}

export async function listSupportConversations() {
  const conversations = await SupportConversation.find()
    .populate({ path: 'userId', select: 'fullName email role' })
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .limit(200)
    .lean();

  return conversations
    .filter((conversation) => conversation.userId)
    .map(serializeConversation);
}

export async function listSupportMessages(conversationId) {
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new AppError('Support conversation not found', 404);
  }

  const conversation = await SupportConversation.exists({ _id: conversationId });
  if (!conversation) throw new AppError('Support conversation not found', 404);

  const messages = await SupportMessage.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(MESSAGE_HISTORY_LIMIT)
    .lean();
  return messages.map(serializeMessage);
}

async function createMessage(conversation, senderRole, senderId, normalizedBody) {
  const message = await SupportMessage.create({
    conversationId: conversation._id,
    ...(senderId ? { senderId } : {}),
    senderRole,
    body: normalizedBody,
  });
  await SupportConversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessageBody: normalizedBody,
        lastMessageAt: message.createdAt,
        lastMessageSenderRole: senderRole,
      },
    },
  );

  return serializeMessage(message);
}

export async function createUserSupportMessage(user, body) {
  const normalizedBody = normalizeBody(body);
  const conversation = await findOrCreateConversation(user._id);
  const message = await createMessage(conversation, 'user', user._id, normalizedBody);
  return { conversationId: String(conversation._id), message };
}

export async function createAdminSupportMessage(conversationId, body) {
  const normalizedBody = normalizeBody(body);
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new AppError('Support conversation not found', 404);
  }
  const conversation = await SupportConversation.findById(conversationId);
  if (!conversation) throw new AppError('Support conversation not found', 404);
  const message = await createMessage(conversation, 'support', undefined, normalizedBody);
  return { userId: String(conversation.userId), message };
}
