import { env } from '../config/env.js';
import { DonorRequestActivity } from '../models/donor-request-activity.model.js';
import { User } from '../models/user.model.js';
import { sendBloodRequestEmail } from './email.service.js';
import { createRequestNotifications } from './notification-inbox.service.js';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const MAX_EXPO_BATCH_SIZE = 100;

function compactError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}

function isExpoPushToken(token) {
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);
}

function plainText(value, maximumLength) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .slice(0, maximumLength);
}

function buildNotificationContent(bloodRequest) {
  const hospitalName = plainText(bloodRequest.hospitalName, 48) || 'a nearby hospital';
  const city = plainText(bloodRequest.city, 32);
  const bloodType = plainText(bloodRequest.bloodType, 3);
  const urgency =
    bloodRequest.urgency === 'critical'
      ? 'Critical'
      : bloodRequest.urgency === 'urgent'
        ? 'Urgent'
        : 'Routine';
  const locationText = city ? ` in ${city}` : '';

  return {
    title: `${urgency} ${bloodType} blood request`,
    body: `${hospitalName}${locationText} needs a matching donor. Open BloodBridge to respond.`,
  };
}

function buildEventContent(type, bloodRequest, donorName) {
  const requestLabel = `${bloodRequest.bloodType} request at ${bloodRequest.hospitalName}`;
  const contentByType = {
    donor_matching_complete: {
      title: 'Donor matching complete',
      body: `${bloodRequest.hospitalName} has been matched with eligible donors for the ${bloodRequest.bloodType} request.`,
    },
    donor_response_summary: {
      title: 'Donor responses updated',
      body: 'Review the latest ranked donor response summary in BloodBridge.',
    },
    donor_accepted: {
      title: 'Donor accepted your request',
      body: `${donorName} accepted the ${requestLabel}. Review the response in BloodBridge.`,
    },
    donor_declined: {
      title: 'Donor declined your request',
      body: `${donorName} is not available for the ${requestLabel}.`,
    },
    donor_confirmed: {
      title: 'Hospital confirmed your donation',
      body: `${bloodRequest.hospitalName} confirmed your response for the ${bloodRequest.bloodType} request.`,
    },
    donation_completed: {
      title: 'Donation marked completed',
      body: `${bloodRequest.hospitalName} recorded your ${bloodRequest.bloodType} donation as completed.`,
    },
    donation_no_show: {
      title: 'Donation marked as no-show',
      body: `${bloodRequest.hospitalName} recorded a no-show for the ${bloodRequest.bloodType} request.`,
    },
  };

  return contentByType[type];
}

export async function dispatchRequestEvent({
  bloodRequest,
  type,
  recipients,
  donorName,
  notificationContent,
}) {
  const content = notificationContent ?? buildEventContent(type, bloodRequest, donorName);
  if (!content || recipients.length === 0) return;

  const isNewNotification = await createRequestNotifications({
    bloodRequest,
    type,
    title: content.title,
    body: content.body,
    recipients,
  });
  if (!isNewNotification) return;

  const users = await User.find({ _id: { $in: recipients.map((recipient) => recipient.id) } })
    .select('expoPushTokens notificationPreferences')
    .lean();
  const messages = users.flatMap((user) => {
    if (user.notificationPreferences?.pushEnabled === false) return [];
    return (user.expoPushTokens ?? []).filter((entry) => isExpoPushToken(entry.token)).map((entry) => ({
      message: {
        to: entry.token,
        sound: 'default',
        title: content.title,
        body: content.body,
        channelId: 'blood-requests',
        data: { requestId: String(bloodRequest._id), url: '/notifications' },
      },
    }));
  });

  for (let index = 0; index < messages.length; index += MAX_EXPO_BATCH_SIZE) {
    await sendExpoBatch(messages.slice(index, index + MAX_EXPO_BATCH_SIZE));
  }
}

async function sendExpoBatch(messages) {
  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
      ...(env.expoPushAccessToken
        ? { Authorization: `Bearer ${env.expoPushAccessToken}` }
        : {}),
    },
    body: JSON.stringify(messages.map((entry) => entry.message)),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.errors?.[0]?.message ?? `Expo Push Service returned ${response.status}`);
  }

  const tickets = Array.isArray(body.data) ? body.data : [];
  return messages.map((entry, index) => ({ entry, ticket: tickets[index] }));
}

async function runWithConcurrency(items, concurrency, worker) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await worker(item);
    }
  });

  await Promise.all(workers);
}

async function deliverEmailNotifications(activities, bloodRequest, hospital) {
  await runWithConcurrency(activities, 5, async (activity) => {
    if (activity.emailStatus) return;

    const claim = await DonorRequestActivity.updateOne(
      { _id: activity._id, emailStatus: { $exists: false } },
      { $set: { emailStatus: 'processing' } },
    );
    if (claim.modifiedCount !== 1) return;

    const donor = activity.donorId;
    const emailEnabled = donor.notificationPreferences?.emailEnabled ?? true;
    const donorEmail = typeof donor.email === 'string' ? donor.email.trim().toLowerCase() : '';

    if (!emailEnabled) {
      await DonorRequestActivity.updateOne(
        { _id: activity._id },
        { $set: { emailStatus: 'skipped' }, $unset: { emailError: 1 } },
      );
      return;
    }

    if (!donorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail)) {
      await DonorRequestActivity.updateOne(
        { _id: activity._id },
        { $set: { emailStatus: 'failed', emailError: 'Donor email address is invalid' } },
      );
      return;
    }

    try {
      await sendBloodRequestEmail({
        donor: { fullName: donor.fullName, email: donorEmail },
        hospital: { fullName: hospital.fullName, email: hospital.email },
        bloodRequest,
        matchRank: activity.matchRank,
        matchPercentage: activity.matchPercentage,
      });

      await DonorRequestActivity.updateOne(
        { _id: activity._id },
        {
          $set: {
            emailStatus: 'sent',
            emailSentAt: new Date(),
          },
          $unset: { emailError: 1 },
        },
      );
    } catch (error) {
      await DonorRequestActivity.updateOne(
        { _id: activity._id },
        { $set: { emailStatus: 'failed', emailError: compactError(error) } },
      );
    }
  });
}

async function deliverPushNotifications(activities, content, bloodRequest) {
  const pushEntries = [];
  const updatesByActivity = new Map();

  for (const activity of activities) {
    if (activity.pushStatus) continue;

    const claim = await DonorRequestActivity.updateOne(
      { _id: activity._id, pushStatus: { $exists: false } },
      { $set: { pushStatus: 'processing' } },
    );
    if (claim.modifiedCount !== 1) continue;

    const donor = activity.donorId;
    const pushEnabled = donor.notificationPreferences?.pushEnabled ?? true;
    const tokens = (donor.expoPushTokens ?? [])
      .map((entry) => entry.token)
      .filter(isExpoPushToken);

    if (!pushEnabled || tokens.length === 0) {
      updatesByActivity.set(String(activity._id), {
        status: 'skipped',
        error: pushEnabled ? 'No registered Expo push token' : undefined,
        ticketIds: [],
      });
      continue;
    }

    for (const token of tokens) {
      pushEntries.push({
        activityId: String(activity._id),
        message: {
          to: token,
          sound: 'default',
          title: content.title,
          body: content.body,
          channelId: 'blood-requests',
          priority: bloodRequest.urgency === 'standard' ? 'normal' : 'high',
          data: {
            requestId: String(bloodRequest._id),
            url: '/notifications',
          },
        },
      });
    }
  }

  for (let index = 0; index < pushEntries.length; index += MAX_EXPO_BATCH_SIZE) {
    const batch = pushEntries.slice(index, index + MAX_EXPO_BATCH_SIZE);

    try {
      const results = await sendExpoBatch(batch);
      for (const { entry, ticket } of results) {
        const current = updatesByActivity.get(entry.activityId) ?? {
          status: 'failed',
          ticketIds: [],
          errors: [],
        };

        if (ticket?.status === 'ok') {
          current.status = 'queued';
          if (ticket.id) current.ticketIds.push(ticket.id);
        } else {
          current.errors.push(ticket?.message ?? ticket?.details?.error ?? 'Push was rejected');
        }
        updatesByActivity.set(entry.activityId, current);
      }
    } catch (error) {
      for (const entry of batch) {
        const current = updatesByActivity.get(entry.activityId) ?? {
          status: 'failed',
          ticketIds: [],
          errors: [],
        };
        current.errors.push(compactError(error));
        updatesByActivity.set(entry.activityId, current);
      }
    }
  }

  if (updatesByActivity.size === 0) return;

  await DonorRequestActivity.bulkWrite(
    [...updatesByActivity].map(([activityId, result]) => ({
      updateOne: {
        filter: { _id: activityId },
        update: {
          $set: {
            pushStatus: result.status,
            pushTicketIds: result.ticketIds,
            ...(result.error || result.errors?.length
              ? { pushError: result.error ?? result.errors.join('; ').slice(0, 500) }
              : {}),
          },
          ...(!result.error && !result.errors?.length ? { $unset: { pushError: 1 } } : {}),
        },
      },
    })),
  );
}

export async function dispatchMatchNotifications(bloodRequest, donorIds) {
  if (donorIds.length === 0) return;

  const hospital = await (await import('../models/user.model.js')).User.findById(bloodRequest.hospitalId)
    .select('fullName email')
    .lean();

  const activities = await DonorRequestActivity.find({
    requestId: bloodRequest._id,
    donorId: { $in: donorIds },
    $or: [{ pushStatus: { $exists: false } }, { emailStatus: { $exists: false } }],
  }).populate({
    path: 'donorId',
    select: 'fullName email notificationPreferences expoPushTokens',
  });
  const validActivities = activities.filter((activity) => activity.donorId);
  const content = buildNotificationContent(bloodRequest);

  await createRequestNotifications({
    bloodRequest,
    type: 'blood_request_matched',
    title: content.title,
    body: content.body,
    recipients: validActivities.map((activity) => ({
      id: activity.donorId._id,
      role: 'donor',
      matchRank: activity.matchRank,
    })),
  });

  await Promise.all([
    deliverPushNotifications(
      validActivities.filter((activity) => !activity.pushStatus),
      content,
      bloodRequest,
    ),
    deliverEmailNotifications(
      validActivities.filter((activity) => !activity.emailStatus),
      bloodRequest,
      hospital,
    ),
  ]);
}
