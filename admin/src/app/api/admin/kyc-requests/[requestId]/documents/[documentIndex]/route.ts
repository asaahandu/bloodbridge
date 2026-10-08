type RouteContext = {
  params: Promise<{ requestId: string; documentIndex: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { requestId, documentIndex } = await params;
  if (!/^[a-f\d]{24}$/i.test(requestId) || !/^\d+$/.test(documentIndex)) {
    return new Response("KYC document not found", { status: 404 });
  }

  const apiUrl = (process.env.BLOODBRIDGE_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
  const adminToken = process.env.ADMIN_DASHBOARD_TOKEN?.trim();
  if (!adminToken) {
    return new Response("Admin dashboard authentication is not configured", { status: 503 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${apiUrl}/admin/kyc-requests/${encodeURIComponent(requestId)}/documents/${documentIndex}`,
      {
        cache: "no-store",
        headers: { Authorization: `Bearer ${adminToken}` },
        signal: AbortSignal.timeout(8_000),
      },
    );
  } catch {
    return new Response("The BloodBridge API could not be reached", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(
      upstream.status === 404 ? "KYC document not found" : "The KYC document could not be loaded",
      { status: upstream.status || 502 },
    );
  }

  const mimeType = upstream.headers.get("content-type");
  if (
    mimeType !== "application/pdf" &&
    mimeType !== "image/jpeg" &&
    mimeType !== "image/png"
  ) {
    return new Response("The BloodBridge API returned an unsupported document type", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
