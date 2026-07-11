import { createHash } from "crypto";
import { extractBotbizLeadFields } from "@/lib/botbiz/extract-lead-fields";
import { resolveWhatsAppLeadNotes } from "@/lib/leads/lead-notes-display";
import { phonesMatch } from "@/lib/botbiz/normalize-phone";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types/database";

const ACTIVE_STATUSES = ["new", "assigned", "in_progress", "successful"] as const;

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

async function findExistingLead(
  fields: NonNullable<ReturnType<typeof extractBotbizLeadFields>>
): Promise<Lead | null> {
  const supabase = createAdminClient();

  if (fields.botbiz_subscriber_id) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("botbiz_subscriber_id", fields.botbiz_subscriber_id)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data as Lead;
  }

  if (fields.client_phone) {
    const { data: candidates } = await supabase
      .from("leads")
      .select("*")
      .eq("source", "whatsapp")
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(20);

    const match = (candidates as Lead[] | null)?.find((lead) =>
      phonesMatch(lead.client_phone, fields.client_phone)
    );
    if (match) return match;
  }

  return null;
}

export type CreateWhatsAppLeadResult =
  | { success: true; lead_id: string; created: boolean; updated: boolean }
  | { success: false; error: string };

export async function reprocessWhatsAppLeadFromMetadata(leadId: string): Promise<CreateWhatsAppLeadResult> {
  const supabase = createAdminClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .select("whatsapp_metadata")
    .eq("id", leadId)
    .single();

  if (error || !lead?.whatsapp_metadata) {
    return { success: false, error: error?.message ?? "Lead has no whatsapp_metadata to reprocess." };
  }

  return createWhatsAppLeadFromPayload(lead.whatsapp_metadata);
}

export async function createWhatsAppLeadFromPayload(
  payload: unknown
): Promise<CreateWhatsAppLeadResult> {
  const fields = extractBotbizLeadFields(payload);
  if (!fields) {
    return {
      success: false,
      error:
        "Missing phone/subscriber (and no client name). Enable POSTBACK + SUBSCRIBER ID / PHONE in Botbiz webhook.",
    };
  }

  const idempotencyKey = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  const supabase = createAdminClient();

  // 1. Idempotency check: did we already process this exact payload?
  const { data: duplicate } = await supabase
    .from("leads")
    .select("id")
    .eq("webhook_idempotency_key", idempotencyKey)
    .maybeSingle();

  if (duplicate) {
    console.log(`[botbiz webhook] Ignored duplicate payload for lead ${duplicate.id}`);
    return { success: true, lead_id: duplicate.id, created: false, updated: false };
  }

  const createdBy = await getWhatsAppSystemUserId();
  const existing = await findExistingLead(fields);

  // If this is an early-contact ping and we already have a fuller lead, keep the richer data
  const existingLooksComplete =
    existing &&
    existing.client_name &&
    !/^WhatsApp\s/i.test(existing.client_name) &&
    (existing.loan_type != null ||
      existing.personal_loan_amount_range != null ||
      (existing.whatsapp_slot_answers?.length ?? 0) > 0);

  if (fields.is_early_contact && existingLooksComplete) {
    // Still refresh subscriber/phone/language if missing, but don't wipe form data
    const lightPatch: Record<string, unknown> = {
      webhook_idempotency_key: idempotencyKey,
      updated_at: new Date().toISOString(),
    };
    if (!existing.botbiz_subscriber_id && fields.botbiz_subscriber_id) {
      lightPatch.botbiz_subscriber_id = fields.botbiz_subscriber_id;
    }
    if (!existing.client_phone && fields.client_phone) {
      lightPatch.client_phone = fields.client_phone;
    }
    await supabase.from("leads").update(lightPatch).eq("id", existing.id);
    return { success: true, lead_id: existing.id, created: false, updated: false };
  }

  const mergedName =
    fields.is_early_contact && existing?.client_name && !/^WhatsApp\s/i.test(existing.client_name)
      ? existing.client_name
      : fields.client_name;

  const leadPatch = {
    client_name: mergedName,
    client_phone: fields.client_phone ?? existing?.client_phone ?? null,
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
    preferred_language: fields.preferred_language,
    whatsapp_metadata: payload as Record<string, unknown>,
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

    if (error) return { success: false, error: error.message };

    // Only notify admins when form details arrive (upgrade), not on every early postback
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
    // Concurrent duplicate insert: unique on webhook_idempotency_key
    if (error.code === "23505" && error.message.includes("webhook_idempotency_key")) {
      const { data: existingByKey } = await supabase
        .from("leads")
        .select("id")
        .eq("webhook_idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existingByKey) {
        return { success: true, lead_id: existingByKey.id, created: false, updated: false };
      }
    }
    return { success: false, error: error.message };
  }

  await notifyAdmins(data, { isUpdate: false, isEarlyContact: fields.is_early_contact });
  return { success: true, lead_id: data.id, created: true, updated: false };
}
