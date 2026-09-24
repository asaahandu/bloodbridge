export type RequestUrgency = 'Critical' | 'Urgent' | 'Routine';

export type AttentionReason = 'critical' | 'stalled' | 'awaiting-confirmation';

export type HospitalRequest = {
  id: string;
  reference: string;
  label: string;
  bloodType: string;
  urgency: RequestUrgency;
  postedAgo: string;
  notified: number;
  responded: number;
  confirmed: number;
  attentionReason?: AttentionReason;
  attentionMessage?: string;
};
