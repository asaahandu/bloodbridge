type RouteContext = {
  params: Promise<{ requestId: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const { requestId } = await params;
  if (!/^[a-f\d]{24}$/i.test(requestId)) {
    return Response.json({ error: "KYC request not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "A valid JSON body is required" }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("status" in body) ||
    (body.status !== "verified" && body.status !== "rejected")
  ) {
    return Response.json({ error: "Status must be verified or rejected" }, { status: 400 });
  }

  const apiUrl = (process.env.BLOODBRIDGE_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
  const adminToken = process.env.ADMIN_DASHBOARD_TOKEN?.trim();
  if (!adminToken) {
    return Response.json(
      { error: "Admin dashboard authentication is not configured" },
      { status: 503 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${apiUrl}/admin/kyc-requests/${encodeURIComponent(requestId)}`,
      {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8_000),
      },
    );
  } catch {
    return Response.json({ error: "The BloodBridge API could not be reached" }, { status: 502 });
  }

  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
