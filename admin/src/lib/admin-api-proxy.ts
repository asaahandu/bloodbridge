import "server-only";

export async function forwardAdminApi(path: string, request?: Request) {
  const apiUrl = (process.env.BLOODBRIDGE_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
  const adminToken = process.env.ADMIN_DASHBOARD_TOKEN?.trim();
  if (!adminToken) {
    return Response.json(
      { error: "Admin dashboard authentication is not configured" },
      { status: 503 },
    );
  }

  const method = request?.method ?? "GET";
  const body = method === "GET" ? undefined : await request?.text();
  let upstream: Response;
  try {
    upstream = await fetch(`${apiUrl}${path}`, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${adminToken}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return Response.json({ error: "The BloodBridge API could not be reached" }, { status: 502 });
  }

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
