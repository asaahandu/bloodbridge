import type { BloodRequest } from '@/components/donor-home';

import type { AuthenticatedUser, StoredBloodRequest } from './api';

const EARTH_RADIUS_KM = 6371;

const urgencyRank: Record<StoredBloodRequest['urgency'], number> = {
  critical: 0,
  urgent: 1,
  standard: 2,
};

type DonorRequestView = {
  distanceKm?: number;
  request: BloodRequest;
  neededByTime: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(
  donorCoordinates: [number, number],
  facilityCoordinates: [number, number],
) {
  const [donorLongitude, donorLatitude] = donorCoordinates;
  const [facilityLongitude, facilityLatitude] = facilityCoordinates;
  const latitudeDelta = toRadians(facilityLatitude - donorLatitude);
  const longitudeDelta = toRadians(facilityLongitude - donorLongitude);
  const donorLatitudeRadians = toRadians(donorLatitude);
  const facilityLatitudeRadians = toRadians(facilityLatitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(donorLatitudeRadians) *
      Math.cos(facilityLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;
  const clampedHaversine = Math.min(1, Math.max(0, haversine));

  return (
    EARTH_RADIUS_KM *
    2 *
    Math.atan2(Math.sqrt(clampedHaversine), Math.sqrt(1 - clampedHaversine))
  );
}

function formatDistance(distanceKm?: number) {
  if (distanceKm == null) return 'Distance unavailable';
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

function formatNeededBy(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'soon';

  const minutesRemaining = Math.round((date.getTime() - Date.now()) / 60_000);
  if (minutesRemaining <= 0) return 'now';
  if (minutesRemaining < 60) return `within ${minutesRemaining} min`;
  if (minutesRemaining < 24 * 60) {
    const hours = Math.ceil(minutesRemaining / 60);
    return `within ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

  return `by ${new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(date)}`;
}

function mapRequest(
  storedRequest: StoredBloodRequest,
  donorCoordinates?: [number, number],
): DonorRequestView {
  const facilityCoordinates = storedRequest.facilityLocation?.coordinates;
  const distanceKm =
    donorCoordinates && facilityCoordinates
      ? calculateDistanceKm(donorCoordinates, facilityCoordinates)
      : undefined;

  return {
    distanceKm,
    neededByTime: new Date(storedRequest.neededBy).getTime(),
    request: {
      id: storedRequest._id,
      bloodType: storedRequest.bloodType,
      distance: formatDistance(distanceKm),
      hospital: storedRequest.hospitalName,
      location: storedRequest.ward || storedRequest.city,
      neededBy: formatNeededBy(storedRequest.neededBy),
      urgency: storedRequest.urgency,
    },
  };
}

export function createDonorRequestViews(
  storedRequests: StoredBloodRequest[],
  donor: AuthenticatedUser,
) {
  const donorCoordinates = donor.location?.coordinates;

  return storedRequests
    .map((request) => mapRequest(request, donorCoordinates))
    .sort((left, right) => {
      const urgencyDifference =
        urgencyRank[left.request.urgency ?? 'standard'] -
        urgencyRank[right.request.urgency ?? 'standard'];
      if (urgencyDifference !== 0) return urgencyDifference;

      const distanceDifference =
        (left.distanceKm ?? Number.POSITIVE_INFINITY) -
        (right.distanceKm ?? Number.POSITIVE_INFINITY);
      if (distanceDifference !== 0) return distanceDifference;

      return left.neededByTime - right.neededByTime;
    })
    .map(({ request }) => request);
}
