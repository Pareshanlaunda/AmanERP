import { listSubscribers, type BotbizSubscriber } from "@/lib/botbiz/api-client";
import { createWhatsAppLeadFromPayload } from "@/lib/botbiz/create-whatsapp-lead";
import { normalizePhone } from "@/lib/botbiz/normalize-phone";
import {
  BOTBIZ_BACKGROUND_SYNC_LIMIT,
  BOTBIZ_SYNC_MAX_PAGES,
  BOTBIZ_SYNC_PAGE_SIZE,
} from "@/lib/leads/dashboard-limits";

export type SyncWhatsAppLeadsResult = {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  pages: number;
  error?: string;
};

async function upsertSubscriberBatch(
  subscribers: BotbizSubscriber[]
): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const sub of subscribers) {
    const phone = normalizePhone(sub.phone);
    if (!phone) {
      skipped += 1;
      continue;
    }

    const displayName = [sub.firstName, sub.lastName].filter(Boolean).join(" ").trim();
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

  return { created, updated, skipped };
}

/**
 * Pull recent Botbiz contacts (latest message first) and upsert ERP leads.
 * Covers gaps when webhook POSTBACK did not fire yet.
 */
export async function syncRecentWhatsAppLeadsFromBotbiz(options?: {
  limit?: number;
}): Promise<SyncWhatsAppLeadsResult> {
  const listed = await listSubscribers({
    limit: options?.limit ?? BOTBIZ_BACKGROUND_SYNC_LIMIT,
    offset: 1,
    orderBy: 1,
  });

  if (!listed.ok) {
    return { ok: false, created: 0, updated: 0, skipped: 0, pages: 0, error: listed.error };
  }

  const batch = await upsertSubscriberBatch(listed.data);
  return { ok: true, pages: 1, ...batch };
}

/**
 * Paginated Botbiz pull — manual admin sync. Webhook still owns real-time unlimited intake.
 */
export async function syncAllWhatsAppLeadsFromBotbiz(options?: {
  pageSize?: number;
  maxPages?: number;
}): Promise<SyncWhatsAppLeadsResult> {
  const pageSize = Math.min(Math.max(options?.pageSize ?? BOTBIZ_SYNC_PAGE_SIZE, 1), 100);
  const maxPages = Math.min(Math.max(options?.maxPages ?? BOTBIZ_SYNC_MAX_PAGES, 1), 100);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let pages = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * pageSize + 1;
    const listed = await listSubscribers({ limit: pageSize, offset, orderBy: 1 });
    if (!listed.ok) {
      return {
        ok: false,
        created,
        updated,
        skipped,
        pages,
        error: listed.error,
      };
    }

    if (listed.data.length === 0) break;

    const batch = await upsertSubscriberBatch(listed.data);
    created += batch.created;
    updated += batch.updated;
    skipped += batch.skipped;
    pages += 1;

    if (listed.data.length < pageSize) break;
  }

  return { ok: true, created, updated, skipped, pages };
}
