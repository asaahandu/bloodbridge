import type { HospitalRequest } from '@/components/hospital-dashboard';

import type { StoredBloodRequest } from './api';

export function formatElapsed(dateValue: string) {
  const elapsedMs = Math.max(0, Date.now() - new Date(dateValue).getTime());
  const minutes = Math.floor(elapsedMs / 60_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function getAttention(request: StoredBloodRequest) {
  const ageMinutes = Math.max(0, Date.now() - new Date(request.createdAt).getTime()) / 60_000;
  const responded = request.donorProgress?.responded ?? 0;
  const confirmed = request.donorProgress?.confirmed ?? 0;

  if (request.urgency === 'critical') {
    return {
      attentionReason: 'critical' as const,
      attentionMessage: 'Critical request requires continuous staff monitoring.',
    };
  }

  if (ageMinutes >= 60 && responded === 0) {
    return {
      attentionReason: 'stalled' as const,
      attentionMessage: 'No donor has responded within the expected window.',
    };
  }

  if (ageMinutes >= 30 && responded > confirmed) {
    return {
      attentionReason: 'awaiting-confirmation' as const,
      attentionMessage: 'Responding donors have not all confirmed attendance.',
    };
  }

  return {};
}

export function toHospitalRequest(request: StoredBloodRequest): HospitalRequest {
  const urgency =
    request.urgency === 'critical'
      ? 'Critical'
      : request.urgency === 'urgent'
        ? 'Urgent'
        : 'Routine';

  return {
    id: request._id,
    reference: request.internalReference,
    label: request.ward || request.hospitalName,
    bloodType: request.bloodType,
    urgency,
    postedAgo: formatElapsed(request.createdAt),
    notified: request.donorProgress?.notified ?? 0,
    responded: request.donorProgress?.responded ?? 0,
    confirmed: request.donorProgress?.confirmed ?? 0,
    ...getAttention(request),
  };
}
