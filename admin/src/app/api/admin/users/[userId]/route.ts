import { forwardAdminApi } from "@/lib/admin-api-proxy";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

function validUserId(value: string) {
  return /^[a-f\d]{24}$/i.test(value);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { userId } = await params;
  if (!validUserId(userId)) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  return forwardAdminApi(`/admin/users/${encodeURIComponent(userId)}`, request);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await params;
  if (!validUserId(userId)) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  return forwardAdminApi(`/admin/users/${encodeURIComponent(userId)}`, _request);
}
