import Constants from 'expo-constants';

export type RegisterUserPayload = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: 'female' | 'male' | 'non-binary' | 'prefer-not-to-say';
  cityRegion: string;
  role: 'donor' | 'hospital';
  bloodType?: string;
  receivesAlerts?: true;
  termsAccepted: true;
  password: string;
};

export type LocationTrackingSession = {
  userId: string;
  token: string;
};

export type DonorAvailabilityPreset =
  | 'anytime'
  | 'weekdays'
  | 'weekends'
  | 'daytime'
  | 'evenings';

export type DonorDonationProfile = {
  lastDonationAt?: string;
  nextEligibleAt?: string;
  eligibilityStatus: 'interval_clear' | 'waiting_period' | 'needs_verification';
  availabilityPreset: DonorAvailabilityPreset;
  maxTravelDistanceKm: 10 | 25 | 50;
};

export type AuthenticatedUser = {
  id: string;
  authToken: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'donor' | 'hospital';
  cityRegion: string;
  bloodType?: string;
  donationProfile?: DonorDonationProfile;
  notificationPreferences?: {
    pushEnabled: boolean;
    emailEnabled: boolean;
  };
  location?: {
    coordinates: [number, number];
    accuracy?: number;
    capturedAt: string;
  };
};

type RegisterUserResponse = {
  data: {
    locationTrackingToken: string;
    user: {
      _id: string;
      fullName: string;
    };
  };
};

type LoginUserResponse = {
  data: {
    authToken: string;
    user: {
      _id: string;
      fullName: string;
      email: string;
      phone: string;
      role: 'donor' | 'hospital';
      cityRegion: string;
      bloodType?: string;
      donationProfile?: DonorDonationProfile;
      notificationPreferences?: {
        pushEnabled: boolean;
        emailEnabled: boolean;
      };
      location?: {
        coordinates: [number, number];
        accuracy?: number;
        capturedAt: string;
      };
    };
  };
};

export type CreateBloodRequestPayload = {
  bloodType: string;
  unitsNeeded: number;
  urgency: 'standard' | 'urgent' | 'critical';
  internalReference: string;
  ward?: string;
  rewardAmount?: number;
  neededBy: string;
};

type CreateBloodRequestResponse = {
  data: {
    _id: string;
    internalReference: string;
    status: 'active' | 'fulfilled' | 'cancelled';
  };
};

export type StoredBloodRequest = {
  _id: string;
  hospitalName: string;
  bloodType: string;
  unitsNeeded: number;
  internalReference: string;
  ward?: string;
  urgency: 'standard' | 'urgent' | 'critical';
  status: 'active' | 'fulfilled' | 'cancelled';
  city: string;
  facilityLocation: {
    type: 'Point';
    coordinates: [number, number];
    accuracy?: number;
  };
  rewardAmount?: number;
  rewardCurrency?: 'XAF';
  donorProgress?: {
    notified?: number;
    responded?: number;
    confirmed?: number;
  };
  donorResponses?: HospitalDonorResponse[];
  neededBy: string;
  createdAt: string;
  updatedAt: string;
};

type BloodRequestListResponse = {
  count: number;
  data: StoredBloodRequest[];
};

export type DonorActivityRecord = {
  id: string;
  request: StoredBloodRequest;
  decision: 'accepted' | 'declined';
  respondedAt: string;
  confirmedAt?: string;
  outcome?: 'completed' | 'no_show';
  outcomeRecordedAt?: string;
};

type DonorActivityListResponse = {
  count: number;
  data: DonorActivityRecord[];
};

type BloodRequestDetailResponse = {
  data: StoredBloodRequest;
};

type CurrentUserResponse = {
  data: {
    user: Omit<AuthenticatedUser, 'authToken'>;
  };
};

type DonorMatchPreviewResponse = {
  data: {
    estimatedDonors: number;
    radiusKm: number;
  };
};

export type HospitalDonorResponse = {
  donorId: string;
  donorName: string;
  bloodType: string;
  decision: 'accepted' | 'declined';
  respondedAt: string;
  confirmedAt?: string;
  outcome?: 'completed' | 'no_show';
  outcomeRecordedAt?: string;
};

export type HospitalDonorDetail = {
  request: {
    id: string;
    hospitalName: string;
    internalReference: string;
    bloodType: string;
    status: 'active' | 'fulfilled' | 'cancelled';
  };
  donor: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    cityRegion: string;
    bloodType: string;
    age?: number;
    gender?: 'female' | 'male' | 'non-binary' | 'prefer-not-to-say';
    lastDonationAt?: string;
  };
  response: {
    decision: 'accepted' | 'declined';
    respondedAt: string;
    confirmedAt?: string;
    outcome?: 'completed' | 'no_show';
    outcomeRecordedAt?: string;
  };
  eligibilityScreening: null | {
    status: 'in_progress' | 'completed';
    answerSummary: string;
    reviewFlags: string[];
    completedAt?: string;
    updatedAt: string;
  };
};

type HospitalDonorDetailResponse = {
  data: HospitalDonorDetail;
};

export type BloodRequestDraft = {
  bloodType: string | null;
  unitsNeeded: number | null;
  urgency: 'standard' | 'urgent' | 'critical' | null;
  internalReference: string | null;
  ward: string | null;
  rewardAmount: number | null;
  missingFields: Array<'bloodType' | 'unitsNeeded' | 'urgency' | 'internalReference'>;
  warnings: string[];
  confidence: 'low' | 'medium' | 'high';
};

type BloodRequestDraftResponse = {
  data: BloodRequestDraft;
};

export type AiChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AiChatResponse = {
  data: {
    message: string;
  };
};

export type AiEligibilityScreening = {
  id: string;
  requestId: string;
  status: 'in_progress' | 'completed';
  messages: Array<AiChatMessage & { id: string; createdAt: string }>;
  coveredTopics: string[];
  answerSummary: string;
  reviewFlags: string[];
  completedAt?: string;
};

type AiEligibilityScreeningResponse = {
  data: AiEligibilityScreening;
};

export type DonorMapMatch = {
  id: string;
  rank: number;
  bloodType: string;
  coordinates: [number, number];
  distanceKm: number;
  estimatedTravelMinutes: number;
  matchPercentage: number;
  reasons: string[];
  eligibility: {
    status: 'interval_clear' | 'needs_verification';
    lastDonationAt?: string;
    nextEligibleAt?: string;
  };
  capturedAt: string;
};

export type DonorMatchScan = {
  requestId: string;
  radiusKm: number;
  modelVersion: string;
  candidateCount: number;
  excluded: Record<string, number>;
  hospital: {
    coordinates: [number, number];
  };
  donors: DonorMapMatch[];
};

type DonorMatchScanResponse = {
  data: DonorMatchScan;
};

type DonorResponseResponse = {
  data: {
    requestId: string;
    decision: 'accepted' | 'declined';
    respondedAt: string;
    confirmedAt?: string;
  };
};

type ApiErrorResponse = {
  error?: {
    message?: string;
    details?: unknown;
  };
};

function normalizeAuthenticatedUser(
  user: Partial<AuthenticatedUser> & { _id?: string },
  authToken: string,
): AuthenticatedUser {
  const id = user.id ?? user._id;

  if (!id || typeof id !== 'string') {
    throw new Error('The authenticated user payload is missing a valid user ID.');
  }

  return {
    id,
    authToken,
    fullName: user.fullName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    role: user.role ?? 'donor',
    cityRegion: user.cityRegion ?? '',
    ...(user.bloodType ? { bloodType: user.bloodType } : {}),
    ...(user.donationProfile ? { donationProfile: user.donationProfile } : {}),
    notificationPreferences: user.notificationPreferences ?? {
      pushEnabled: true,
      emailEnabled: true,
    },
    ...(user.location ? { location: user.location } : {}),
  };
}

function getApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (configuredUrl) return configuredUrl;

  const developmentHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (developmentHost) return `http://${developmentHost}:4000/api/v1`;

  return 'http://localhost:4000/api/v1';
}

async function apiRequest<T>(path: string, options: RequestInit, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    const body = (await response.json().catch(() => ({}))) as T & ApiErrorResponse;
    if (!response.ok) {
      throw new Error(body.error?.message ?? 'The server could not complete this request.');
    }

    return body as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The server took too long to respond. Please try again.');
    }
    if (error instanceof TypeError) {
      throw new Error(
        'Unable to reach the BloodBridge server. Check that the backend is running and the API URL is correct.',
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function registerUser(payload: RegisterUserPayload): Promise<LocationTrackingSession> {
  const response = await apiRequest<RegisterUserResponse>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    userId: response.data.user._id,
    token: response.data.locationTrackingToken,
  };
}

export async function loginUser(credentials: {
  email: string;
  password: string;
}): Promise<AuthenticatedUser> {
  const response = await apiRequest<LoginUserResponse>('/users/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  return normalizeAuthenticatedUser(response.data.user, response.data.authToken);
}

export async function logoutUser(authToken: string) {
  await apiRequest('/users/me/session', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${authToken}` },
  });
}

export async function getCurrentUser(session: AuthenticatedUser): Promise<AuthenticatedUser> {
  const response = await apiRequest<CurrentUserResponse>('/users/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.authToken}` },
  });

  return normalizeAuthenticatedUser(response.data.user, session.authToken);
}

export async function createBloodRequest(
  authToken: string,
  payload: CreateBloodRequestPayload,
) {
  const response = await apiRequest<CreateBloodRequestResponse>('/blood-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function draftBloodRequest(authToken: string, description: string) {
  const response = await apiRequest<BloodRequestDraftResponse>(
    '/blood-requests/draft',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ description }),
    },
    30_000,
  );

  return response.data;
}

export async function sendAiChatMessage(authToken: string, messages: AiChatMessage[]) {
  const response = await apiRequest<AiChatResponse>(
    '/ai/chat',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ messages }),
    },
    40_000,
  );

  return response.data;
}

export async function startAiEligibilityScreening(authToken: string, requestId: string) {
  const response = await apiRequest<AiEligibilityScreeningResponse>(
    `/ai/chat/eligibility/${encodeURIComponent(requestId)}/start`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    },
    40_000,
  );

  return response.data;
}

export async function answerAiEligibilityScreening(
  authToken: string,
  requestId: string,
  message: string,
) {
  const response = await apiRequest<AiEligibilityScreeningResponse>(
    `/ai/chat/eligibility/${encodeURIComponent(requestId)}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ message }),
    },
    40_000,
  );

  return response.data;
}

export async function listActiveBloodRequests(authToken: string) {
  const response = await apiRequest<BloodRequestListResponse>(
    '/blood-requests',
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );

  return response.data;
}

export async function listDonorActivity(authToken: string) {
  const response = await apiRequest<DonorActivityListResponse>('/blood-requests/activity', {
    method: 'GET',
    headers: { Authorization: `Bearer ${authToken}` },
  });

  return response.data;
}

export async function listHospitalBloodRequests(
  authToken: string,
  status: 'active' | 'history' | 'all' = 'all',
) {
  const response = await apiRequest<BloodRequestListResponse>(
    `/blood-requests/mine?status=${encodeURIComponent(status)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );

  return response.data;
}

export async function getHospitalBloodRequest(authToken: string, requestId: string) {
  const response = await apiRequest<BloodRequestDetailResponse>(
    `/blood-requests/mine/${encodeURIComponent(requestId)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );

  return response.data;
}

export async function getHospitalDonorResponseDetail(
  authToken: string,
  requestId: string,
  donorId: string,
) {
  const response = await apiRequest<HospitalDonorDetailResponse>(
    `/blood-requests/mine/${encodeURIComponent(requestId)}/donor-responses/${encodeURIComponent(donorId)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );

  return response.data;
}

export async function updateNotificationPreferences(
  session: AuthenticatedUser,
  preferences: { pushEnabled: boolean; emailEnabled: boolean },
) {
  const response = await apiRequest<CurrentUserResponse>('/users/me/notification-preferences', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${session.authToken}` },
    body: JSON.stringify(preferences),
  });

  return normalizeAuthenticatedUser(response.data.user, session.authToken);
}

export async function updateDonorDonationProfile(
  session: AuthenticatedUser,
  profile: {
    lastDonationAt?: string;
    availabilityPreset: DonorAvailabilityPreset;
    maxTravelDistanceKm: 10 | 25 | 50;
  },
) {
  const response = await apiRequest<CurrentUserResponse>('/users/me/donation-profile', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${session.authToken}` },
    body: JSON.stringify(profile),
  });

  return normalizeAuthenticatedUser(response.data.user, session.authToken);
}

export async function registerExpoPushToken(
  authToken: string,
  registration: { token: string; platform: 'android' | 'ios' },
) {
  await apiRequest('/users/me/push-tokens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify(registration),
  });
}

export async function respondToBloodRequest(
  authToken: string,
  requestId: string,
  decision: 'accepted' | 'declined',
) {
  const response = await apiRequest<DonorResponseResponse>(
    `/blood-requests/${encodeURIComponent(requestId)}/respond`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ decision }),
    },
  );

  return response.data;
}

export async function getHospitalRequestDonorMatches(authToken: string, requestId: string) {
  const response = await apiRequest<DonorMatchScanResponse>(
    `/blood-requests/mine/${encodeURIComponent(requestId)}/ranked-donor-matches`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );

  return response.data;
}

export async function recordHospitalDonorOutcome(
  authToken: string,
  requestId: string,
  donorId: string,
  outcome: 'completed' | 'no_show',
) {
  const response = await apiRequest<BloodRequestDetailResponse>(
    `/blood-requests/mine/${encodeURIComponent(requestId)}/donor-responses/${encodeURIComponent(donorId)}/outcome`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ outcome }),
    },
  );

  return response.data;
}

export async function confirmHospitalDonorResponse(
  authToken: string,
  requestId: string,
  donorId: string,
) {
  const response = await apiRequest<BloodRequestDetailResponse>(
    `/blood-requests/mine/${encodeURIComponent(requestId)}/donor-responses/${encodeURIComponent(donorId)}/confirm`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );

  return response.data;
}

export async function previewDonorMatches(payload: {
  bloodType: string;
  urgency: 'standard' | 'urgent' | 'critical';
  longitude: number;
  latitude: number;
}) {
  const response = await apiRequest<DonorMatchPreviewResponse>('/users/donor-match-preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function saveUserLocation(
  setup: LocationTrackingSession,
  location: {
    longitude: number;
    latitude: number;
    accuracy?: number;
    capturedAt: string;
  },
) {
  await apiRequest(`/users/${encodeURIComponent(setup.userId)}/location`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${setup.token}` },
    body: JSON.stringify(location),
  });
}
