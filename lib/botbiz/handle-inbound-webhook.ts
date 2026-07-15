import { NextResponse } from "next/server";
import { createWhatsAppLeadFromPayload } from "@/lib/botbiz/create-whatsapp-lead";
import { debugLogBotbizPayload } from "@/lib/botbiz/debug-payload";
import { extractBotbizLeadFields } from "@/lib/botbiz/extract-lead-fields";
import { verifyBotbizWebhook } from "@/lib/botbiz/verify-webhook";
import { clientIpFromHeaders } from "@/lib/auth/client-ip";
import {
  isWebhookRateLimitedAsync,
  recordWebhookAttemptAsync,
} from "@/lib/auth/rate-limit";

function webhookRateLimitKey(request: Request): string {
  return `botbiz:${clientIpFromHeaders(request.headers)}`;
}

export async function handleBotbizInboundWebhook(
  request: Request,
  pathToken?: string
): Promise<NextResponse> {
  if (!verifyBotbizWebhook(request, pathToken)) {
    return NextResponse.json({ success: false, error: "Unauthorized webhook" }, { status: 401 });
  }

  const rateKey = webhookRateLimitKey(request);
  if (await isWebhookRateLimitedAsync(rateKey)) {
    return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
  }
  await recordWebhookAttemptAsync(rateKey);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  await debugLogBotbizPayload(payload);

  try {
    const result = await createWhatsAppLeadFromPayload(payload);
    if (!result.success) {
      console.error("[botbiz webhook] save failed", result.error);
      return NextResponse.json(
        { success: false, error: "Unable to save lead" },
        { status: 422 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      const fields = extractBotbizLeadFields(payload);
      if (
        fields &&
        !fields.loan_type &&
        !fields.personal_loan_amount_range &&
        !fields.harassment_faced
      ) {
        const root = payload as Record<string, unknown>;
        console.warn(
          "[botbiz webhook] Lead saved but loan/harassment fields missing. Top-level keys:",
          Object.keys(root).join(", ")
        );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    console.error("[botbiz webhook]", message);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
