import { forwardAdminApi } from "@/lib/admin-api-proxy";

type RouteContext = {
  params: Promise<{ conversationId: string }>;
};

function validConversationId(value: string) {
  return /^[a-f\d]{24}$/i.test(value);
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { conversationId } = await params;
  if (!validConversationId(conversationId)) {
    return Response.json({ error: "Support conversation not found" }, { status: 404 });
  }
  return forwardAdminApi(
    `/admin/support/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  const { conversationId } = await params;
  if (!validConversationId(conversationId)) {
    return Response.json({ error: "Support conversation not found" }, { status: 404 });
  }
  return forwardAdminApi(
    `/admin/support/conversations/${encodeURIComponent(conversationId)}/messages`,
    request,
  );
}
