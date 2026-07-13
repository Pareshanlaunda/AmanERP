import { handleBotbizInboundWebhook } from "@/lib/botbiz/handle-inbound-webhook";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

/** Botbiz outbound URL: /api/webhooks/botbiz/<BOTBIZ_WEBHOOK_SECRET> */
export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  return handleBotbizInboundWebhook(request, token);
}
