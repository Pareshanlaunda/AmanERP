/**
 * Debug logging for Botbiz webhook payloads.
 *
 * Console-only — no file writing to prevent PII (phone numbers,
 * client names) from persisting on disk.
 * Hard-blocked in production even if BOTBIZ_WEBHOOK_DEBUG=true.
 */
export async function debugLogBotbizPayload(payload: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (process.env.BOTBIZ_WEBHOOK_DEBUG !== "true") return;

  const json = JSON.stringify(payload, null, 2);
  console.log("[botbiz webhook debug] Full payload:\n", json);
}
