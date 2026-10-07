export type BloodRequest = {
  id: string;
  bloodType: string;
  distance: string;
  hospital: string;
  location: string;
  neededBy?: string;
  urgency?: 'standard' | 'urgent' | 'critical';
  urgent?: boolean;
};
