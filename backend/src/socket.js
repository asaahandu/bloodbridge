import { Server } from 'socket.io';

import { env } from './config/env.js';
import * as messageService from './services/message.service.js';
import * as supportService from './services/support.service.js';
import { authenticateUserToken } from './services/user.service.js';

function roomForRequest(requestId) {
  return `blood-request:${requestId}`;
}

function roomForUser(userId) {
  return `user:${userId}`;
}

function roomForSupportConversation(conversationId) {
  return `support-conversation:${conversationId}`;
}

function getToken(socket) {
  return socket.handshake.auth?.token;
}

export function attachSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigins.length === 0 ? true : env.clientOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      socket.user = await authenticateUserToken(getToken(socket));
      next();
    } catch {
      next(new Error('Authentication is invalid or expired'));
    }
  });

  io.on('connection', (socket) => {
    socket.use(async (_packet, next) => {
      try {
        socket.user = await authenticateUserToken(getToken(socket));
        next();
      } catch (error) {
        socket.disconnect(true);
        next(error);
      }
    });
    socket.join(roomForUser(socket.user._id));

    socket.on('join-conversation', async ({ requestId, donorId }, callback) => {
      try {
        await messageService.getConversationAccess(requestId, socket.user, donorId);
        socket.join(roomForRequest(`${requestId}:${donorId ?? socket.user._id}`));
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });

    socket.on('send-message', async ({ requestId, donorId, body }, callback) => {
      try {
        const message = await messageService.createMessage(requestId, socket.user, body, donorId);
        io.to(roomForRequest(`${requestId}:${message.donorId}`)).emit('message', message);
        const preview = await messageService.getConversationPreview(message.conversationId);
        const participants = await messageService.getConversationParticipants(message.conversationId);
        if (preview && participants) {
          io.to(roomForUser(participants.donorId)).emit('conversation-preview', preview);
          io.to(roomForUser(participants.hospitalId)).emit('conversation-preview', preview);
        }
        callback?.({ ok: true, message });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });

    socket.on('join-support-conversation', async (payload, callback) => {
      try {
        const conversationId = payload?.conversationId;
        if (typeof conversationId !== 'string') {
          callback?.({ ok: false, error: 'A support conversation is required' });
          return;
        }
        const conversation = await supportService.getUserSupportConversation(socket.user);
        if (conversation.conversationId !== conversationId) {
          callback?.({ ok: false, error: 'You cannot access this support conversation' });
          return;
        }
        await socket.join(roomForSupportConversation(conversationId));
        callback?.({ ok: true, conversationId });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });

    socket.on('send-support-message', async (payload, callback) => {
      try {
        const result = await supportService.createUserSupportMessage(socket.user, payload?.body);
        io.to(roomForSupportConversation(result.conversationId)).emit(
          'support-message',
          result.message,
        );
        callback?.({ ok: true, message: result.message });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });
  });

  return io;
}