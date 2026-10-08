import "server-only";

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "donor" | "hospital";
  cityRegion: string;
  bloodType?: string;
  hospitalVerificationStatus?: "unverified" | "pending" | "rejected" | "verified";
  createdAt: string;
};

export type AdminUsersData = {
  users: AdminUser[];
  total: number;
  donors: number;
  hospitals: number;
  page: number;
  pageSize: number;
};

export class AdminUsersDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminUsersDataError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function isAdminUser(value: unknown): value is AdminUser {
  if (!isRecord(value)) return false;
  const validHospitalStatus =
    value.hospitalVerificationStatus === undefined ||
    ["unverified", "pending", "rejected", "verified"].includes(
      String(value.hospitalVerificationStatus),
    );

  return typeof value.id === "string" &&
    typeof value.fullName === "string" &&
    typeof value.email === "string" &&
    typeof value.phone === "string" &&
    (value.role === "donor" || value.role === "hospital") &&
    typeof value.cityRegion === "string" &&
    (value.bloodType === undefined || typeof value.bloodType === "string") &&
    validHospitalStatus &&
    typeof value.createdAt === "string";
}

function isAdminUsersData(value: unknown): value is AdminUsersData {
  return isRecord(value) &&
    Array.isArray(value.users) &&
    value.users.every(isAdminUser) &&
    Number.isSafeInteger(value.total) &&
    Number.isSafeInteger(value.donors) &&
    Number.isSafeInteger(value.hospitals) &&
    Number.isSafeInteger(value.page) &&
    Number.isSafeInteger(value.pageSize);
}

export async function getAdminUsers(page: number): Promise<AdminUsersData> {
  const apiUrl = (process.env.BLOODBRIDGE_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
  const adminToken = process.env.ADMIN_DASHBOARD_TOKEN?.trim();

  if (!adminToken) {
    throw new AdminUsersDataError(
      "Add ADMIN_DASHBOARD_TOKEN to admin/.env.local to connect this dashboard.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/admin/users?page=${page}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new AdminUsersDataError(
      `The BloodBridge API could not be reached at ${apiUrl}.`,
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new AdminUsersDataError(
        "The admin token does not match the token configured by the BloodBridge API.",
      );
    }
    if (response.status === 503) {
      throw new AdminUsersDataError(
        "Set ADMIN_DASHBOARD_TOKEN in backend/.env and restart the API.",
      );
    }
    throw new AdminUsersDataError(`The BloodBridge API returned status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  const data = isRecord(payload) ? payload.data : undefined;
  if (!isAdminUsersData(data)) {
    throw new AdminUsersDataError("The BloodBridge API returned an invalid users response.");
  }

  return data;
}
