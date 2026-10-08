import "server-only";

export type AdminBloodRequest = {
  id: string;
  hospitalName: string;
  hospitalVerificationStatus: "unverified" | "pending" | "rejected" | "verified";
  city: string;
  bloodType: string;
  unitsNeeded: number;
  internalReference: string;
  ward?: string;
  urgency: "standard" | "urgent" | "critical";
  status: "active" | "fulfilled" | "cancelled";
  rewardAmount?: number;
  rewardCurrency?: "XAF";
  createdAt: string;
  neededBy: string;
  donorProgress: { notified: number; responded: number; confirmed: number };
};

export type AdminCampaign = {
  id: string;
  hospitalName: string;
  hospitalVerificationStatus: "unverified" | "pending" | "rejected" | "verified";
  title: string;
  date: string;
  upcoming: boolean;
  location: string;
  description: string;
  images: Array<{ name: string; mimeType: "image/jpeg" | "image/png"; size: number }>;
  createdAt: string;
};

export type AdminKycRequest = {
  id: string;
  hospitalName: string;
  hospitalVerificationStatus: "unverified" | "pending" | "rejected" | "verified";
  hospitalEmail: string;
  hospitalPhone: string;
  cityRegion: string;
  status: "pending" | "verified" | "rejected";
  submittedAt: string;
  documents: Array<{ name: string; mimeType: "application/pdf" | "image/jpeg" | "image/png"; size: number }>;
};

export type AdminKycRequestDetail = Omit<AdminKycRequest, "documents"> & {
  status: "pending" | "verified" | "rejected";
  documents: Array<{
    index: number;
    name: string;
    mimeType: "application/pdf" | "image/jpeg" | "image/png";
    size: number;
  }>;
};

type CollectionData = {
  total: number;
  page: number;
  pageSize: number;
};

export type AdminBloodRequestsData = CollectionData & {
  requests: AdminBloodRequest[];
  active: number;
  fulfilled: number;
  cancelled: number;
  critical: number;
};

export type AdminCampaignsData = CollectionData & {
  campaigns: AdminCampaign[];
  upcoming: number;
  past: number;
};

export type AdminKycRequestsData = CollectionData & {
  requests: AdminKycRequest[];
  pending: number;
  verified: number;
  rejected: number;
};

export class AdminCollectionsDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminCollectionsDataError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isHospitalVerificationStatus(value: unknown): boolean {
  return ["unverified", "pending", "rejected", "verified"].includes(String(value));
}

function isCollectionData<T>(
  value: unknown,
  key: string,
  isItem: (item: unknown) => item is T,
): value is Record<string, unknown> & CollectionData & Record<string, T[]> {
  return isRecord(value) &&
    Array.isArray(value[key]) &&
    value[key].every(isItem) &&
    isNonNegativeInteger(value.total) &&
    Number.isSafeInteger(value.page) &&
    Number(value.page) > 0 &&
    Number.isSafeInteger(value.pageSize) &&
    Number(value.pageSize) > 0;
}

function isAdminBloodRequest(value: unknown): value is AdminBloodRequest {
  if (!isRecord(value) || !isRecord(value.donorProgress)) return false;
  return typeof value.id === "string" &&
    typeof value.hospitalName === "string" &&
  isHospitalVerificationStatus(value.hospitalVerificationStatus) &&
    typeof value.city === "string" &&
    typeof value.bloodType === "string" &&
    isNonNegativeInteger(value.unitsNeeded) &&
    typeof value.internalReference === "string" &&
    ["standard", "urgent", "critical"].includes(String(value.urgency)) &&
    ["active", "fulfilled", "cancelled"].includes(String(value.status)) &&
    (value.rewardAmount === undefined || isNonNegativeInteger(value.rewardAmount)) &&
    (value.rewardCurrency === undefined || value.rewardCurrency === "XAF") &&
    typeof value.createdAt === "string" &&
    typeof value.neededBy === "string" &&
    isNonNegativeInteger(value.donorProgress.notified) &&
    isNonNegativeInteger(value.donorProgress.responded) &&
    isNonNegativeInteger(value.donorProgress.confirmed);
}

function isAdminCampaign(value: unknown): value is AdminCampaign {
  if (!isRecord(value) || !Array.isArray(value.images)) return false;
  return typeof value.id === "string" &&
    typeof value.hospitalName === "string" &&
  isHospitalVerificationStatus(value.hospitalVerificationStatus) &&
    typeof value.title === "string" &&
    typeof value.date === "string" &&
    typeof value.upcoming === "boolean" &&
    typeof value.location === "string" &&
    typeof value.description === "string" &&
    value.images.every((image) => isRecord(image) &&
      typeof image.name === "string" &&
      (image.mimeType === "image/jpeg" || image.mimeType === "image/png") &&
      isNonNegativeInteger(image.size)) &&
    typeof value.createdAt === "string";
}

function isAdminKycRequest(value: unknown): value is AdminKycRequest {
  if (!isRecord(value) || !Array.isArray(value.documents)) return false;
  return typeof value.id === "string" &&
    typeof value.hospitalName === "string" &&
  isHospitalVerificationStatus(value.hospitalVerificationStatus) &&
    typeof value.hospitalEmail === "string" &&
    typeof value.hospitalPhone === "string" &&
    typeof value.cityRegion === "string" &&
    ["pending", "verified", "rejected"].includes(String(value.status)) &&
    typeof value.submittedAt === "string" &&
    value.documents.every((document) => isRecord(document) &&
      typeof document.name === "string" &&
      ["application/pdf", "image/jpeg", "image/png"].includes(String(document.mimeType)) &&
      isNonNegativeInteger(document.size));
}

function isAdminKycRequestDetail(value: unknown): value is AdminKycRequestDetail {
  if (!isRecord(value) || !Array.isArray(value.documents)) return false;
  return typeof value.id === "string" &&
    typeof value.hospitalName === "string" &&
    typeof value.hospitalEmail === "string" &&
    typeof value.hospitalPhone === "string" &&
    typeof value.cityRegion === "string" &&
    ["pending", "verified", "rejected"].includes(String(value.status)) &&
    typeof value.submittedAt === "string" &&
    value.documents.every((document) => isRecord(document) &&
      Number.isSafeInteger(document.index) &&
      Number(document.index) >= 0 &&
      typeof document.name === "string" &&
      ["application/pdf", "image/jpeg", "image/png"].includes(String(document.mimeType)) &&
      isNonNegativeInteger(document.size));
}

export async function getAdminKycRequest(requestId: string): Promise<AdminKycRequestDetail> {
  const apiUrl = (process.env.BLOODBRIDGE_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
  const adminToken = process.env.ADMIN_DASHBOARD_TOKEN?.trim();
  if (!adminToken) {
    throw new AdminCollectionsDataError(
      "Add ADMIN_DASHBOARD_TOKEN to admin/.env.local to connect this dashboard.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/admin/kyc-requests/${encodeURIComponent(requestId)}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new AdminCollectionsDataError(
      `The BloodBridge API could not be reached at ${apiUrl}.`,
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new AdminCollectionsDataError(
        "The admin token does not match the token configured by the BloodBridge API.",
      );
    }
    if (response.status === 503) {
      throw new AdminCollectionsDataError(
        "Set ADMIN_DASHBOARD_TOKEN in backend/.env and restart the API.",
      );
    }
    if (response.status === 404) {
      throw new AdminCollectionsDataError("The requested KYC submission could not be found.");
    }
    throw new AdminCollectionsDataError(`The BloodBridge API returned status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  const data = isRecord(payload) ? payload.data : undefined;
  if (!isAdminKycRequestDetail(data)) {
    throw new AdminCollectionsDataError("The BloodBridge API returned an invalid KYC submission.");
  }
  return data;
}

async function fetchCollection<T>(
  path: string,
  page: number,
  key: string,
  isItem: (item: unknown) => item is T,
): Promise<Record<string, unknown> & CollectionData & Record<string, T[]>> {
  const apiUrl = (process.env.BLOODBRIDGE_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
  const adminToken = process.env.ADMIN_DASHBOARD_TOKEN?.trim();
  if (!adminToken) {
    throw new AdminCollectionsDataError(
      "Add ADMIN_DASHBOARD_TOKEN to admin/.env.local to connect this dashboard.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/admin/${path}?page=${page}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new AdminCollectionsDataError(
      `The BloodBridge API could not be reached at ${apiUrl}.`,
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new AdminCollectionsDataError(
        "The admin token does not match the token configured by the BloodBridge API.",
      );
    }
    if (response.status === 503) {
      throw new AdminCollectionsDataError(
        "Set ADMIN_DASHBOARD_TOKEN in backend/.env and restart the API.",
      );
    }
    throw new AdminCollectionsDataError(`The BloodBridge API returned status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  const data = isRecord(payload) ? payload.data : undefined;
  if (!isCollectionData(data, key, isItem)) {
    throw new AdminCollectionsDataError("The BloodBridge API returned an invalid records response.");
  }
  return data;
}

export async function getAdminBloodRequests(page: number): Promise<AdminBloodRequestsData> {
  const data = await fetchCollection("blood-requests", page, "requests", isAdminBloodRequest);
  if (!isNonNegativeInteger(data.active) ||
      !isNonNegativeInteger(data.fulfilled) ||
      !isNonNegativeInteger(data.cancelled) ||
      !isNonNegativeInteger(data.critical)) {
    throw new AdminCollectionsDataError("The BloodBridge API returned invalid blood request totals.");
  }
  return {
    requests: data.requests,
    total: data.total,
    active: data.active,
    fulfilled: data.fulfilled,
    cancelled: data.cancelled,
    critical: data.critical,
    page: data.page,
    pageSize: data.pageSize,
  };
}

export async function getAdminCampaigns(page: number): Promise<AdminCampaignsData> {
  const data = await fetchCollection("campaigns", page, "campaigns", isAdminCampaign);
  if (!isNonNegativeInteger(data.upcoming) || !isNonNegativeInteger(data.past)) {
    throw new AdminCollectionsDataError("The BloodBridge API returned invalid campaign totals.");
  }
  return {
    campaigns: data.campaigns,
    total: data.total,
    upcoming: data.upcoming,
    past: data.past,
    page: data.page,
    pageSize: data.pageSize,
  };
}

export async function getAdminKycRequests(page: number): Promise<AdminKycRequestsData> {
  const data = await fetchCollection("kyc-requests", page, "requests", isAdminKycRequest);
  if (!isNonNegativeInteger(data.pending) ||
      !isNonNegativeInteger(data.verified) ||
      !isNonNegativeInteger(data.rejected)) {
    throw new AdminCollectionsDataError("The BloodBridge API returned invalid KYC request totals.");
  }
  return {
    requests: data.requests,
    total: data.total,
    pending: data.pending,
    verified: data.verified,
    rejected: data.rejected,
    page: data.page,
    pageSize: data.pageSize,
  };
}
