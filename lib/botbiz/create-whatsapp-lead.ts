import { createHash } from "crypto";
import { extractBotbizLeadFields } from "@/lib/botbiz/extract-lead-fields";
import { resolveWhatsAppLeadNotes } from "@/lib/leads/lead-notes-display";
import { normalizePhone, phonesMatch } from "@/lib/botbiz/normalize-phone";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types/database";

/** Prefer open pipeline leads when several match the same phone. */
const STATUS_RANK: Record<string, number> = {
  new: 0,
  assigned: 1,
  in_progress: 2,
  successful: 3,
  converted: 4,
  lost: 5,
};

function phoneFromSubscriberId(subscriberId: string | null | undefined): string | null {
  if (!subscriberId) return null;
  const match = String(subscriberId).match(/(\d{10,15})/);
  return match ? normalizePhone(match[1]) : null;
}

function resolveContactPhone(
  fields: NonNullable<ReturnType<typeof extractBotbizLeadFields>>
): string | null {
  return normalizePhone(fields.client_phone) ?? phoneFromSubscriberId(fields.botbiz_subscriber_id);
}

function pickBestLead(matches: Lead[]): Lead {
  return [...matches].sort((a, b) => {
    const rankA = STATUS_RANK[a.status] ?? 50;
    const rankB = STATUS_RANK[b.status] ?? 50;
    if (rankA !== rankB) return rankA - rankB;
    const aAt = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bAt = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bAt - aAt;
  })[0]!;
}

async function getWhatsAppSystemUserId(): Promise<string> {
  const configured = process.env.WHATSAPP_SYSTEM_USER_ID?.trim();
  if (configured) return configured;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error("No admin profile found for WhatsApp leads. Set WHATSAPP_SYSTEM_USER_ID.");
  }

  return data.id;
}

async function notifyAdmins(
  lead: Pick<Lead, "id" | "client_name">,
  options: { isUpdate: boolean; isEarlyContact: boolean }
) {
  const supabase = createAdminClient();
  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");

  if (!admins?.length) return;

  const title = options.isUpdate
    ? options.isEarlyContact
      ? "WhatsApp lead still waiting on form"
      : "WhatsApp lead details updated"
    : options.isEarlyContact
      ? "New WhatsApp contact"
      : "New WhatsApp lead";

  const body = options.isEarlyContact
    ? `${lead.client_name} — first WhatsApp contact (form not finished yet)`
    : `${lead.client_name} — from Botbiz (Client_Details)`;

  await supabase.from("notifications").insert(
    admins.map((admin) => ({
      user_id: admin.id,
      type: "lead_updated" as const,
      title,
      body,
      lead_id: lead.id,
    }))
  );
}

/**
 * One person / one WhatsApp number → one lead.
 * Match by phone (any status) or subscriber id — never insert a second row for repeat messages.
 */
async function findExistingLead(
  fields: NonNullable<ReturnType<typeof extractBotbizLeadFields>>
): Promise<Lead | null> {
  const supabase = createAdminClient();
  const phone = resolveContactPhone(fields);

  // Prefer indexed lookups before broad scan.
  if (fields.botbiz_subscriber_id) {
    const { data: bySub, error: subError } = await supabase
      .from("leads")
      .select("*")
      .eq("source", "whatsapp")
      .eq("botbiz_subscriber_id", fields.botbiz_subscriber_id)
      .maybeSingle();
    if (subError) {
      console.error("[botbiz] findExistingLead subscriber lookup failed", subError.message);
      throw new Error("Unable to match WhatsApp lead");
    }
    if (bySub) return bySub as Lead;
  }

  // Broad fetch: small team ERP; phone formats vary so we match in app.
  const { data: candidates, error: listError } = await supabase
    .from("leads")
    .select("*")
    .eq("source", "whatsapp")
    .order("created_at", { ascending: false })
    .limit(500);

  if (listError) {
    console.error("[botbiz] findExistingLead scan failed", listError.message);
    throw new Error("Unable to match WhatsApp lead");
  }

  const rows = (candidates ?? []) as Lead[];
  if (!rows.length) return null;

  const matches = rows.filter((lead) => {
    if (phone) {
      if (phonesMatch(lead.client_phone, phone)) return true;
      if (phonesMatch(phoneFromSubscriberId(lead.botbiz_subscriber_id), phone)) return true;
    }
    if (
      fields.botbiz_subscriber_id &&
      lead.botbiz_subscriber_id &&
      lead.botbiz_subscriber_id === fields.botbiz_subscriber_id
    ) {
      return true;
    }
    // Same WhatsApp identity, different id string shapes (webhook vs sync)
    if (fields.botbiz_subscriber_id && lead.botbiz_subscriber_id) {
      const a = phoneFromSubscriberId(fields.botbiz_subscriber_id);
      const b = phoneFromSubscriberId(lead.botbiz_subscriber_id);
      if (a && b && phonesMatch(a, b)) return true;
    }
    return false;
  });

  if (!matches.length) return null;
  return pickBestLead(matches);
}

export type CreateWhatsAppLeadResult =
  | { success: true; lead_id: string; created: boolean; updated: boolean }
  | { success: false; error: string };

export async function reprocessWhatsAppLeadFromMetadata(
  leadId: string
): Promise<CreateWhatsAppLeadResult> {
  const supabase = createAdminClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .select("whatsapp_metadata")
    .eq("id", leadId)
    .single();

  if (error || !lead?.whatsapp_metadata) {
    if (error) console.error("[botbiz] reprocess lookup failed", error.message);
    return { success: false, error: "Unable to reprocess WhatsApp lead" };
  }

  return createWhatsAppLeadFromPayload(lead.whatsapp_metadata);
}

function isSubscriberSyncPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  return (payload as { postback_id?: unknown }).postback_id === "botbiz_subscriber_sync";
}

export async function createWhatsAppLeadFromPayload(
  payload: unknown
): Promise<CreateWhatsAppLeadResult> {
  const extracted = extractBotbizLeadFields(payload);
  if (!extracted) {
    return {
      success: false,
      error:
        "Missing phone/subscriber (and no client name). Enable POSTBACK + SUBSCRIBER ID / PHONE in Botbiz webhook.",
    };
  }

  // Admin-dashboard Botbiz pull must never overwrite form metadata / slot answers.
  // Subscriber directory often has a display name → extract treats it as "complete" form.
  const subscriberSync = isSubscriberSyncPayload(payload);
  const fields = subscriberSync
    ? {
        ...extracted,
        is_early_contact: true,
        whatsapp_slot_answers: [] as typeof extracted.whatsapp_slot_answers,
        loan_type: null,
        personal_loan_amount_range: null,
        credit_card_amount_range: null,
        harassment_faced: null,
        notes:
          "Early WhatsApp contact — Client_Details not completed yet. Employee can follow up in chat.",
      }
    : extracted;

  const contactPhone = resolveContactPhone(fields);
  const idempotencyKey = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  const supabase = createAdminClient();

  // Exact same webhook body already applied
  const { data: duplicate } = await supabase
    .from("leads")
    .select("id")
    .eq("webhook_idempotency_key", idempotencyKey)
    .maybeSingle();

  if (duplicate) {
    return { success: true, lead_id: duplicate.id, created: false, updated: false };
  }

  const createdBy = await getWhatsAppSystemUserId();
  let existing: Lead | null;
  try {
    existing = await findExistingLead(fields);
  } catch (err) {
    console.error("[botbiz] findExistingLead failed", err);
    return { success: false, error: "Unable to match WhatsApp lead" };
  }

  // Repeat early pings (POSTBACK / sync) on a lead that already has form data — touch only
  const existingLooksComplete =
    existing &&
    existing.client_name &&
    !/^WhatsApp\s/i.test(existing.client_name) &&
    (existing.loan_type != null ||
      existing.personal_loan_amount_range != null ||
      (existing.whatsapp_slot_answers?.length ?? 0) > 0);

  if (fields.is_early_contact && existing) {
    const lightPatch: Record<string, unknown> = {
      webhook_idempotency_key: idempotencyKey,
      updated_at: new Date().toISOString(),
    };
    // Never clobber a form-entered phone on early pings / language taps.
    if (contactPhone && !existing.client_phone) {
      lightPatch.client_phone = contactPhone;
    }
    if (fields.botbiz_subscriber_id && !existing.botbiz_subscriber_id) {
      lightPatch.botbiz_subscriber_id = fields.botbiz_subscriber_id;
    }
    // Sync directory pull must not stomp language; webhook early pings may set it.
    if (!subscriberSync && fields.preferred_language) {
      lightPatch.preferred_language = fields.preferred_language;
    }
    // Keep richer name / form fields when early ping repeats (never from subscriber sync)
    if (
      !subscriberSync &&
      !existingLooksComplete &&
      fields.client_name &&
      !/^WhatsApp\s/i.test(fields.client_name)
    ) {
      lightPatch.client_name = fields.client_name;
    }

    const { error: lightError } = await supabase
      .from("leads")
      .update(lightPatch)
      .eq("id", existing.id);
    if (lightError) {
      console.error("[botbiz] early-contact update failed", lightError.message);
      return { success: false, error: "Unable to save lead" };
    }
    // No admin spam on every message / language tap
    return { success: true, lead_id: existing.id, created: false, updated: false };
  }

  const mergedName =
    fields.is_early_contact && existing?.client_name && !/^WhatsApp\s/i.test(existing.client_name)
      ? existing.client_name
      : fields.client_name;

  const leadPatch = {
    client_name: mergedName,
    client_phone: contactPhone ?? existing?.client_phone ?? null,
    client_alternate_phone: fields.client_alternate_phone ?? existing?.client_alternate_phone ?? null,
    client_email: fields.client_email ?? existing?.client_email ?? null,
    loan_amount: fields.loan_amount ?? existing?.loan_amount ?? null,
    personal_loan_amount_range:
      fields.personal_loan_amount_range ?? existing?.personal_loan_amount_range ?? null,
    credit_card_amount_range:
      fields.credit_card_amount_range ?? existing?.credit_card_amount_range ?? null,
    loan_type: fields.loan_type ?? existing?.loan_type ?? null,
    harassment_faced: fields.harassment_faced ?? existing?.harassment_faced ?? null,
    notes: fields.is_early_contact
      ? resolveWhatsAppLeadNotes(fields.notes, existing?.notes)
      : resolveWhatsAppLeadNotes(fields.notes, null),
    botbiz_subscriber_id: fields.botbiz_subscriber_id ?? existing?.botbiz_subscriber_id ?? null,
    preferred_language: subscriberSync
      ? (existing?.preferred_language ?? fields.preferred_language)
      : fields.preferred_language,
    whatsapp_metadata: subscriberSync
      ? (existing?.whatsapp_metadata ?? (payload as Record<string, unknown>))
      : (payload as Record<string, unknown>),
    whatsapp_slot_answers: fields.is_early_contact
      ? existing?.whatsapp_slot_answers ?? fields.whatsapp_slot_answers
      : fields.whatsapp_slot_answers,
    webhook_idempotency_key: idempotencyKey,
    source: "whatsapp" as const,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabase
      .from("leads")
      .update(leadPatch)
      .eq("id", existing.id)
      .select("id, client_name")
      .single();

    if (error) {
      console.error("[botbiz] update lead failed", error.message);
      return { success: false, error: "Unable to save lead" };
    }

    // Notify only when form details arrive (upgrade), not every message
    if (!fields.is_early_contact) {
      await notifyAdmins(data, { isUpdate: true, isEarlyContact: false });
    }
    return { success: true, lead_id: data.id, created: false, updated: true };
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      ...leadPatch,
      status: "new",
      created_by: createdBy,
    })
    .select("id, client_name")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Idempotency key, unique phone, or unique subscriber — coalesce onto existing row.
      if (error.message.includes("webhook_idempotency_key")) {
        const { data: existingByKey } = await supabase
          .from("leads")
          .select("id")
          .eq("webhook_idempotency_key", idempotencyKey)
          .maybeSingle();
        if (existingByKey) {
          return { success: true, lead_id: existingByKey.id, created: false, updated: false };
        }
      }
      let raced: Lead | null = null;
      try {
        raced = await findExistingLead(fields);
      } catch (err) {
        console.error("[botbiz] race coalesce failed", err);
        return { success: false, error: "Unable to save lead" };
      }
      if (raced) {
        if (subscriberSync) {
          return { success: true, lead_id: raced.id, created: false, updated: false };
        }
        await supabase
          .from("leads")
          .update({ ...leadPatch, updated_at: new Date().toISOString() })
          .eq("id", raced.id);
        return { success: true, lead_id: raced.id, created: false, updated: true };
      }
    }
    console.error("[botbiz] insert lead failed", error.message);
    return { success: false, error: "Unable to save lead" };
  }

  await notifyAdmins(data, { isUpdate: false, isEarlyContact: fields.is_early_contact });
  return { success: true, lead_id: data.id, created: true, updated: false };
}
