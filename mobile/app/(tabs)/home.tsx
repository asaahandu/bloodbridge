import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, SafeAreaView, ScrollView } from 'react-native';

import {
  DonationHistoryCard,
  DonorHeader,
  DonorStatusCard,
  ImpactSummary,
  UrgentRequestsSection,
} from '@/components/donor-home';
import type { BloodRequest } from '@/components/donor-home';

const nearbyRequests: BloodRequest[] = [
  {
    id: 'central-city-o-positive',
    bloodType: 'O+',
    distance: '2.4 km',
    hospital: 'Central City Hospital',
    location: 'Emergency ward',
    urgent: true,
  },
  {
    id: 'st-mary-o-positive',
    bloodType: 'O+',
    distance: '5.1 km',
    hospital: 'St. Mary Medical Center',
    location: 'Maternity unit',
  },
];

export default function DonorHomeScreen() {
  const [available, setAvailable] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName={`px-5 pb-8 ${Platform.OS === 'android' ? 'pt-7' : 'pt-3'}`}
        showsVerticalScrollIndicator={false}>
        <DonorHeader donorName="Alex" />
        <DonorStatusCard
          available={available}
          bloodType="O+"
          matchCount={3}
          onAvailabilityChange={setAvailable}
        />
        <UrgentRequestsSection requests={nearbyRequests} />
        <ImpactSummary donations={4} livesImpacted={12} daysUntilEligible={18} />
        <DonationHistoryCard date="June 24" hospital="Central City Hospital" />
      </ScrollView>
    </SafeAreaView>
  );
}
