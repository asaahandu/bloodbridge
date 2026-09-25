import { BloodRequest } from '../models/blood-request.model.js';
import { Conversation } from '../models/conversation.model.js';
import { DonorRequestActivity } from '../models/donor-request-activity.model.js';
import { Message } from '../models/message.model.js';
import { AppError } from '../utils/app-error.js';

export async function getConversationAccess(requestId, user, donorId) {
  const request = await BloodRequest.findById(requestId)
    .select('_id hospitalId hospitalName internalReference bloodType')
    .lean();
  if (!request) throw new AppError('Blood request not found', 404);

  if (user.role === 'hospital') {
    if (String(request.hospitalId) !== String(user._id)) {
      throw new AppError('You cannot access this conversation', 403);
    }

    const activities = await DonorRequestActivity.find({
      requestId,
      ...(donorId ? { donorId } : {}),
      decision: 'accepted',
    })
      .populate({ path: 'donorId', select: 'fullName bloodType' })
      .lean();
    return { request, activities };
  }

  const activity = await DonorRequestActivity.findOne({
    requestId,
    donorId: user._id,
    decision: 'accepted',
  }).lean();
  if (!activity) throw new AppError('Accept this request before messaging the hospital', 403);

  return { request, activities: [activity] };
}

function serializeMessage(message) {
  return {
    id: String(message._id),
    conversationId: String(message.conversationId),
    requestId: String(message.requestId),
    donorId: String(message.donorId),
    senderId: String(message.senderId),
    senderRole: message.senderRole,
    body: message.body,
    createdAt: message.createdAt,
  };
}

function serializeConversation(conversation) {
  return {
    id: String(conversation._id),
    requestId: String(conversation.requestId._id ?? conversation.requestId),
    hospitalName: conversation.requestId.hospitalName,
    internalReference: conversation.requestId.internalReference,
    bloodType: conversation.requestId.bloodType,
    donorId: String(conversation.donorId._id ?? conversation.donorId),
    donorName: conversation.donorId.fullName,
    donorBloodType: conversation.donorId.bloodType,
    lastMessageBody: conversation.lastMessageBody ?? '',
    lastMessageAt: conversation.lastMessageAt ?? conversation.createdAt,
  };
}

export async function getConversationPreview(conversationId) {
  const conversation = await Conversation.findById(conversationId)
    .populate({ path: 'requestId', select: 'hospitalName internalReference bloodType' })
    .populate({ path: 'donorId', select: 'fullName bloodType' })
    .lean();
  if (!conversation?.requestId || !conversation.donorId) return null;
  return serializeConversation(conversation);
}

export async function getConversationParticipants(conversationId) {
  return Conversation.findById(conversationId).select('hospitalId donorId').lean();
}

export async function listConversations(user) {
  const conversations = await Conversation.find(
    user.role === 'hospital' ? { hospitalId: user._id } : { donorId: user._id },
  )
    .populate({ path: 'requestId', select: 'hospitalName internalReference bloodType' })
    .populate({ path: 'donorId', select: 'fullName bloodType' })
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .limit(100)
    .lean();

  return conversations
    .filter((conversation) => conversation.requestId && conversation.donorId)
    .map(serializeConversation);
}

export async function listMessages(requestId, user, donorId) {
  const { activities } = await getConversationAccess(requestId, user, donorId);
  const participantId = user.role === 'donor' ? user._id : activities[0]?.donorId?._id ?? activities[0]?.donorId;
  const conversation = await Conversation.findOne({ requestId, donorId: participantId }).lean();
  if (!conversation) return [];
  const messages = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();
  return messages.map(serializeMessage);
}

export async function createMessage(requestId, user, body, donorId) {
  const { request, activities } = await getConversationAccess(requestId, user, donorId);
  const normalizedBody = typeof body === 'string' ? body.trim() : '';
  if (!normalizedBody) throw new AppError('Message cannot be empty', 400);
  if (normalizedBody.length > 2_000) throw new AppError('Message is too long', 400);

  const participantId = user.role === 'donor' ? user._id : activities[0]?.donorId?._id ?? activities[0]?.donorId;
  if (!participantId) throw new AppError('No accepted donor is available for this conversation', 409);

  const conversation = await Conversation.findOneAndUpdate(
    { requestId: request._id, donorId: participantId },
    {
      $setOnInsert: {
        requestId: request._id,
        hospitalId: request.hospitalId,
        donorId: participantId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const message = await Message.create({
    conversationId: conversation._id,
    requestId: request._id,
    hospitalId: request.hospitalId,
    donorId: participantId,
    senderId: user._id,
    senderRole: user.role,
    body: normalizedBody,
  });
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessageBody: normalizedBody,
        lastMessageAt: message.createdAt,
        lastMessageSenderRole: user.role,
      },
    },
  );
  return serializeMessage(message);
}