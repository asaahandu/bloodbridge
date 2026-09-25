import { Server } from 'socket.io';

import { env } from './config/env.js';
import * as messageService from './services/message.service.js';
import { authenticateUserToken } from './services/user.service.js';

function roomForRequest(requestId) {
  return `blood-request:${requestId}`;
}

function roomForUser(userId) {
  return `user:${userId}`;
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
  });

  return io;
}