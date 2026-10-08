export type BloodRequest = {
  id: string;
  bloodType: string;
  distance: string;
  hospital: string;
  hospitalVerificationStatus?: 'unverified' | 'pending' | 'rejected' | 'verified';
  location: string;
  neededBy?: string;
  urgency?: 'standard' | 'urgent' | 'critical';
  urgent?: boolean;
};
