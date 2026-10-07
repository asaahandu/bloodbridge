import type { DonorMapMatch } from '@/lib/api';

export type DonorSearchMapProps = {
  donors: DonorMapMatch[];
  hospitalCoordinates: [number, number];
  hospitalName: string;
  radiusKm: number;
  showRadius: boolean;
  viewRadiusKm: number;
};
