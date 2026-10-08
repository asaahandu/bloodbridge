import assert from 'node:assert/strict';
import test from 'node:test';

import { SupportConversation } from '../src/models/support-conversation.model.js';
import { SupportMessage } from '../src/models/support-message.model.js';
import {
  createAdminSupportMessage,
  createUserSupportMessage,
} from '../src/services/support.service.js';

test('persists user support messages and updates the conversation preview', async () => {
  const originals = {
    findOneAndUpdate: SupportConversation.findOneAndUpdate,
    updateOne: SupportConversation.updateOne,
    create: SupportMessage.create,
  };
  const conversation = {
    _id: 'conversation-1',
    userId: 'user-1',
    createdAt: new Date('2026-10-08T12:00:00.000Z'),
  };
  const updates = [];
  const createdMessages = [];

  SupportConversation.findOneAndUpdate = async (query, update, options) => {
    assert.deepEqual(query, { userId: 'user-1' });
    assert.deepEqual(update, { $setOnInsert: { userId: 'user-1' } });
    assert.equal(options.upsert, true);
    return conversation;
  };
  SupportMessage.create = async (message) => {
    createdMessages.push(message);
    return {
      _id: 'message-1',
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      body: message.body,
      createdAt: new Date('2026-10-08T12:01:00.000Z'),
    };
  };
  SupportConversation.updateOne = async (...args) => updates.push(args);

  try {
    const result = await createUserSupportMessage(
      { _id: 'user-1' },
      '  I need help with my account.  ',
    );

    assert.deepEqual(result, {
      conversationId: 'conversation-1',
      message: {
        id: 'message-1',
        conversationId: 'conversation-1',
        senderId: 'user-1',
        senderRole: 'user',
        body: 'I need help with my account.',
        createdAt: new Date('2026-10-08T12:01:00.000Z'),
      },
    });
    assert.deepEqual(createdMessages, [{
      conversationId: 'conversation-1',
      senderId: 'user-1',
      senderRole: 'user',
      body: 'I need help with my account.',
    }]);
    assert.equal(updates.length, 1);
    assert.deepEqual(updates[0][1].$set, {
      lastMessageBody: 'I need help with my account.',
      lastMessageAt: new Date('2026-10-08T12:01:00.000Z'),
      lastMessageSenderRole: 'user',
    });
  } finally {
    SupportConversation.findOneAndUpdate = originals.findOneAndUpdate;
    SupportConversation.updateOne = originals.updateOne;
    SupportMessage.create = originals.create;
  }
});

test('persists support replies against the requested customer conversation', async () => {
  const originals = {
    findById: SupportConversation.findById,
    updateOne: SupportConversation.updateOne,
    create: SupportMessage.create,
  };
  const conversation = { _id: 'conversation-2', userId: 'customer-2' };
  let createdMessage;

  SupportConversation.findById = async (id) => {
    assert.equal(id, '507f1f77bcf86cd799439011');
    return conversation;
  };
  SupportMessage.create = async (message) => {
    createdMessage = message;
    return {
      _id: 'message-2',
      conversationId: message.conversationId,
      senderRole: message.senderRole,
      body: message.body,
      createdAt: new Date('2026-10-08T12:05:00.000Z'),
    };
  };
  SupportConversation.updateOne = async () => {};

  try {
    const result = await createAdminSupportMessage(
      '507f1f77bcf86cd799439011',
      'We can help with that.',
    );

    assert.equal(result.userId, 'customer-2');
    assert.equal(result.message.senderRole, 'support');
    assert.equal(result.message.senderId, null);
    assert.equal(createdMessage.senderId, undefined);
    assert.equal(createdMessage.body, 'We can help with that.');
  } finally {
    SupportConversation.findById = originals.findById;
    SupportConversation.updateOne = originals.updateOne;
    SupportMessage.create = originals.create;
  }
});

test('rejects empty support messages before writing them', async () => {
  const original = SupportMessage.create;
  SupportMessage.create = async () => {
    throw new Error('Invalid message should not be written');
  };

  try {
    await assert.rejects(
      createUserSupportMessage({ _id: 'user-3' }, '  '),
      { message: 'Message cannot be empty' },
    );
  } finally {
    SupportMessage.create = original;
  }
});
