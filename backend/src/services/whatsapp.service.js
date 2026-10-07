import { env } from '../config/env.js';

function formatNeededBy(dateString) {
  if (!dateString) return 'As soon as possible';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'As soon as possible';
  return date.toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
}

function formatRequestDetails(bloodRequest) {
  const neededBy = formatNeededBy(bloodRequest.neededBy);
  if (bloodRequest.rewardAmount == null) return neededBy;

  const rewardAmount = Number(bloodRequest.rewardAmount);
  if (!Number.isFinite(rewardAmount) || rewardAmount < 0) return neededBy;

  const rewardCurrency = bloodRequest.rewardCurrency || 'XAF';
  return `${neededBy} | Reward: ${rewardAmount.toLocaleString('en-US')} ${rewardCurrency}`;
}

export function buildBloodRequestWhatsAppMessage({
  donor,
  hospital,
  bloodRequest,
  matchRank,
}) {
  const phone = typeof donor.phone === 'string' ? donor.phone.replace(/[\s()-]/g, '') : '';
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error('Donor phone number must be in international format, such as +237600000000');
  }

  const hospitalName = hospital.fullName || bloodRequest.hospitalName || 'A nearby hospital';
  const urgency =
    bloodRequest.urgency === 'critical'
      ? 'Critical'
      : bloodRequest.urgency === 'urgent'
        ? 'Urgent'
        : 'Routine';

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone.slice(1),
    type: 'template',
    template: {
      name: env.whatsapp.templateName,
      language: { code: env.whatsapp.templateLanguage },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: donor.fullName || 'Donor' },
            { type: 'text', text: hospitalName },
            { type: 'text', text: urgency },
            { type: 'text', text: bloodRequest.bloodType },
            { type: 'text', text: bloodRequest.city || 'your area' },
            { type: 'text', text: String(matchRank ?? 'N/A') },
            { type: 'text', text: formatRequestDetails(bloodRequest) },
          ],
        },
      ],
    },
  };
}

export async function sendBloodRequestWhatsApp({
  donor,
  hospital,
  bloodRequest,
  matchRank,
}) {
  if (
    !env.whatsapp.accessToken ||
    !env.whatsapp.phoneNumberId ||
    !env.whatsapp.templateName
  ) {
    throw new Error('Meta WhatsApp Cloud API is not configured');
  }

  const message = buildBloodRequestWhatsAppMessage({
    donor,
    hospital,
    bloodRequest,
    matchRank,
  });
  const response = await fetch(
    `https://graph.facebook.com/${env.whatsapp.graphApiVersion}/${env.whatsapp.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(10_000),
    },
  );
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error?.message ?? `Meta WhatsApp Cloud API returned ${response.status}`,
    );
  }

  const messageId = result.messages?.[0]?.id;
  if (typeof messageId !== 'string') {
    throw new Error('Meta WhatsApp Cloud API did not return a message ID');
  }

  return { messageId };
}
