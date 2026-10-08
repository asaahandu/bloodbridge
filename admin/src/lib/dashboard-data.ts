import "server-only";

export type DashboardAlert = {
  type: "critical_requests" | "pending_verifications" | "delivery_failures" | "healthy";
  tone: "danger" | "warning" | "success";
  title: string;
  description: string;
};

export type DashboardData = {
  generatedAt: string;
  metrics: {
    donors: { total: number };
    hospitals: { total: number; verified: number; pending: number };
    activeRequests: { total: number; critical: number };
  };
  donorResponses: {
    periodDays: number;
    notified: number;
    total: number;
    accepted: number;
    declined: number;
    responseRate: number | null;
    acceptanceRate: number | null;
    changePercent: number | null;
    series: Array<{
      date: string;
      label: string;
      notified: number;
      total: number;
      accepted: number;
      declined: number;
      responseRate: number | null;
    }>;
  };
  activeRequests: Array<{
    id: string;
    hospitalName: string;
    hospitalVerificationStatus: "unverified" | "pending" | "rejected" | "verified";
    city: string;
    bloodType: string;
    unitsNeeded: number;
    urgency: "standard" | "urgent" | "critical";
    createdAt: string;
    neededBy: string;
    donorProgress: { notified: number; responded: number; confirmed: number };
  }>;
  alerts: DashboardAlert[];
};

export class DashboardDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardDataError";
  }
}

function isDashboardData(value: unknown): value is DashboardData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<DashboardData>;
  return Boolean(
    data.metrics &&
      data.donorResponses &&
      Array.isArray(data.donorResponses.series) &&
      Array.isArray(data.activeRequests) &&
      data.activeRequests.every((request) =>
        ["unverified", "pending", "rejected", "verified"].includes(
          String(request.hospitalVerificationStatus),
        ),
      ) &&
      Array.isArray(data.alerts) &&
      typeof data.generatedAt === "string",
  );
}

export async function getDashboardData(): Promise<DashboardData> {
  const apiUrl = (process.env.BLOODBRIDGE_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
  const adminToken = process.env.ADMIN_DASHBOARD_TOKEN?.trim();

  if (!adminToken) {
    throw new DashboardDataError(
      "Add ADMIN_DASHBOARD_TOKEN to admin/.env.local to connect this dashboard.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/admin/dashboard`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new DashboardDataError(
      `The BloodBridge API could not be reached at ${apiUrl}.`,
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new DashboardDataError(
        "The admin token does not match the token configured by the BloodBridge API.",
      );
    }
    if (response.status === 503) {
      throw new DashboardDataError(
        "Set ADMIN_DASHBOARD_TOKEN in backend/.env and restart the API.",
      );
    }
    throw new DashboardDataError(`The BloodBridge API returned status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  const data = payload && typeof payload === "object" && "data" in payload
    ? (payload as { data: unknown }).data
    : undefined;

  if (!isDashboardData(data)) {
    throw new DashboardDataError("The BloodBridge API returned an invalid dashboard response.");
  }

  return data;
}
