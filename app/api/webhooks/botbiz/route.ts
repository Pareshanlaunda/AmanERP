import { NextResponse } from "next/server";
import { handleBotbizInboundWebhook } from "@/lib/botbiz/handle-inbound-webhook";

export const runtime = "nodejs";

/** Reachability check — does not authenticate. */
export async function GET() {
  return NextResponse.json({ ok: true });
}

/**
 * POST without path token only works with headers, or query if
 * BOTBIZ_ALLOW_QUERY_SECRET=true (migration). Prefer /api/webhooks/botbiz/<secret>.
 */
export async function POST(request: Request) {
  return handleBotbizInboundWebhook(request);
}
