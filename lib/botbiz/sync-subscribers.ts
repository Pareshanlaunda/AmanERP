import { listSubscribers } from "@/lib/botbiz/api-client";
import { createWhatsAppLeadFromPayload } from "@/lib/botbiz/create-whatsapp-lead";
import { normalizePhone } from "@/lib/botbiz/normalize-phone";

export type SyncWhatsAppLeadsResult = {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  error?: string;
};

/**
 * Pull recent Botbiz contacts (latest message first) and upsert ERP leads.
 * Covers: customer messaged us first, or we messaged them first — even when
 * Botbiz POSTBACK webhook did not fire yet.
 */
export async function syncRecentWhatsAppLeadsFromBotbiz(options?: {
  limit?: number;
}): Promise<SyncWhatsAppLeadsResult> {
  const listed = await listSubscribers({
    limit: options?.limit ?? 40,
    offset: 1,
    orderBy: 1,
  });

  if (!listed.ok) {
    return { ok: false, created: 0, updated: 0, skipped: 0, error: listed.error };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const sub of listed.data) {
    const phone = normalizePhone(sub.phone);
    if (!phone) {
      skipped += 1;
      continue;
    }

    const displayName = [sub.firstName, sub.lastName].filter(Boolean).join(" ").trim();
    // Stable identity = phone; findExistingLead dedupes by phone across webhook + sync shapes
    const result = await createWhatsAppLeadFromPayload({
      subscriber_id: `${phone}-${sub.subscriberId}`,
      phone_number: phone,
      subscriber_name: displayName || "",
      postback_id: "botbiz_subscriber_sync",
    });

    if (!result.success) {
      skipped += 1;
      continue;
    }
    if (result.created) created += 1;
    else if (result.updated) updated += 1;
    else skipped += 1;
  }

  return { ok: true, created, updated, skipped };
}
