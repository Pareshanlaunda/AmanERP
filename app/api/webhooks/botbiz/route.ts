import { NextResponse } from "next/server";
import { createWhatsAppLeadFromPayload } from "@/lib/botbiz/create-whatsapp-lead";
import { debugLogBotbizPayload } from "@/lib/botbiz/debug-payload";
import { extractBotbizLeadFields } from "@/lib/botbiz/extract-lead-fields";
import { verifyBotbizWebhook } from "@/lib/botbiz/verify-webhook";
import { isWebhookRateLimited, recordWebhookAttempt } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

function webhookRateLimitKey(request: Request): string {
  const url = new URL(request.url);
  const secretHint = url.searchParams.get("secret")?.slice(0, 8) ?? "nosecret";
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `botbiz:${secretHint}:${ip}`;
}

export async function POST(request: Request) {
  if (!verifyBotbizWebhook(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized webhook" }, { status: 401 });
  }

  const rateKey = webhookRateLimitKey(request);
  if (isWebhookRateLimited(rateKey)) {
    return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
  }
  recordWebhookAttempt(rateKey);

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
      return NextResponse.json(result, { status: 422 });
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
