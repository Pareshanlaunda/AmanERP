/** Log server detail; return safe client copy (no PostgREST/schema leaks). */
export function publicActionError(
  safeMessage: string,
  detail?: { message?: string } | string | null
): string {
  const raw = typeof detail === "string" ? detail : detail?.message;
  if (raw) console.error(`[action] ${safeMessage}:`, raw);
  return safeMessage;
}

/** Map Botbiz / config failures to employee-safe copy. */
export function publicBotbizError(detail?: string | null): string {
  const raw = (detail ?? "").toLowerCase();
  if (!raw) return "WhatsApp request failed. Try again.";
  if (raw.includes("24") || raw.includes("outside")) {
    return "Outside the 24-hour messaging window. Send a template instead.";
  }
  if (raw.includes("not configured") || raw.includes("api_key") || raw.includes("botbiz")) {
    console.error("[botbiz]", detail);
    return "WhatsApp is temporarily unavailable. Contact admin.";
  }
  console.error("[botbiz]", detail);
  return "WhatsApp request failed. Try again.";
}
