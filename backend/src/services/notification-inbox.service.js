import { Notification } from '../models/notification.model.js';

export async function createRequestNotifications({
  bloodRequest,
  type,
  title,
  body,
  recipients,
}) {
  if (recipients.length === 0) return;

  const result = await Notification.bulkWrite(
    recipients.map((recipient) => ({
      updateOne: {
        filter: {
          recipientId: recipient.id,
          requestId: bloodRequest._id,
          type,
        },
        update: {
          $set: {
            title,
            body,
          },
          $setOnInsert: {
            recipientRole: recipient.role,
            type,
            ...(recipient.matchRank ? { matchRank: recipient.matchRank } : {}),
          },
        },
        upsert: true,
      },
    })),
  );

  return result.upsertedCount > 0;
}

export async function listNotifications(recipientId) {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipientId }).sort({ createdAt: -1 }).limit(100).lean(),
    Notification.countDocuments({ recipientId, readAt: { $exists: false } }),
  ]);

  return {
    unreadCount,
    notifications: notifications.map((notification) => ({
      id: String(notification._id),
      type: notification.type,
      title: notification.title,
      body: notification.body,
      requestId: String(notification.requestId),
      ...(notification.matchRank ? { matchRank: notification.matchRank } : {}),
      ...(notification.readAt ? { readAt: notification.readAt } : {}),
      createdAt: notification.createdAt,
    })),
  };
}

export async function markNotificationsRead(recipientId) {
  await Notification.updateMany(
    { recipientId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
  );
}