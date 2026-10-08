import { forwardAdminApi } from "@/lib/admin-api-proxy";

export function GET() {
  return forwardAdminApi("/admin/support/conversations");
}
