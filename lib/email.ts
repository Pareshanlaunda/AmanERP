import type { ClientOnboarding } from "@/lib/validations/onboarding";

/**
 * Send completed onboarding summary to advocate when RESEND_API_KEY + RESEND_FROM_EMAIL set.
 * No-op (logged once per cold start) when email is not configured.
 */
let warnedMissingResend = false;

export async function sendAdvocateEmail(record: ClientOnboarding): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = record.advocate_email?.trim();

  if (!apiKey || !from) {
    if (!warnedMissingResend && process.env.NODE_ENV !== "production") {
      warnedMissingResend = true;
      console.info(
        "[email] Advocate email skipped — set RESEND_API_KEY and RESEND_FROM_EMAIL to enable"
      );
    }
    return;
  }

  if (!to) {
    console.warn("[email] No advocate_email on onboarding record", record.id);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New client onboarding: ${record.client_name}`,
        text: [
          `Client: ${record.client_name}`,
          record.client_id ? `CLID: ${record.client_id}` : null,
          record.client_contact_number ? `Phone: ${record.client_contact_number}` : null,
          "",
          "Open AMAN ERP to view the full onboarding form.",
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] Resend failed", res.status, body.slice(0, 300));
    }
  } catch (err) {
    console.error("[email] Resend request error", err);
  }
}
