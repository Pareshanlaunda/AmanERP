"use server";

import { requireUserWithRole } from "@/lib/auth/get-user";
import { assertClientAccess } from "@/lib/auth/client-access";
import { createClient } from "@/lib/supabase/server";
import { buildReasonParagraphs } from "@/lib/notices/reason-options";
import { resolveSigningAdvocate } from "@/lib/notices/resolve-advocate";
import { DEFAMATION_CRIMINAL_CHARGES_RS } from "@/lib/notices/defamation-constants";
import { stripClidRefSuffix } from "@/lib/notices/format-notice-date";
import { getTemplateFieldConfig } from "@/lib/notices/template-fields";
import {
  saveClientNoticeSchema,
  type SaveClientNoticeInput,
} from "@/lib/validations/notices";
import { revalidatePath } from "next/cache";

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

/** Map client_onboarding_id → latest notice id */
export async function getLatestNoticeIdsForClients(
  clientOnboardingIds: string[]
): Promise<Record<string, string>> {
  if (clientOnboardingIds.length === 0) return {};

  await requireUserWithRole(["admin", "employee"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notices")
    .select("id, client_onboarding_id, created_at")
    .in("client_onboarding_id", clientOnboardingIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[notices] getLatestNoticeIds failed", error.message);
    throw new Error("Unable to load notice links");
  }
  if (!data) return {};

  const map: Record<string, string> = {};
  for (const row of data) {
    const cid = row.client_onboarding_id as string;
    if (!map[cid]) map[cid] = row.id as string;
  }
  return map;
}

export type NoticeDefaults = {
  client_onboarding_id: string;
  client_name: string;
  client_id: string | null;
  client_contact_number: string | null;
  client_email: string | null;
  loan_amount: number | null;
  previous_monthly_emi: number | null;
  loan_type: string | null;
  advocate_name: string;
  advocate_email: string;
  signing_advocate_name: string;
  signing_advocate_email: string | null;
  signing_advocate_address: string | null;
  signing_advocate_mobile: string | null;
  advocate_source: "additional_assignee" | "onboarding_fallback";
  lead_id: string | null;
};

export async function getClientNoticeDefaults(
  clientOnboardingId: string
): Promise<ActionResult<NoticeDefaults>> {
  const user = await requireUserWithRole(["admin", "employee"]);
  const supabase = await createClient();
  const access = await assertClientAccess(
    supabase,
    clientOnboardingId,
    user.id,
    user.role
  );
  if (!access.ok) return { success: false, error: access.error };

  const client = access.client;
  const advocate = await resolveSigningAdvocate(supabase, {
    leadId: client.lead_id,
    fallbackName: client.advocate_name ?? "",
    fallbackEmail: client.advocate_email,
  });

  let signingEmail = advocate.email;
  if (advocate.profileId) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const { data: authUser } = await admin.auth.admin.getUserById(advocate.profileId);
      signingEmail = authUser?.user?.email ?? signingEmail;
    } catch {
      // keep fallback
    }
  }

  return {
    success: true,
    data: {
      client_onboarding_id: client.id,
      client_name: client.client_name,
      client_id: client.client_id,
      client_contact_number: client.client_contact_number,
      client_email: client.client_email,
      loan_amount: client.loan_amount,
      previous_monthly_emi: client.previous_monthly_emi ?? null,
      loan_type: client.loan_type,
      advocate_name: client.advocate_name ?? "",
      advocate_email: client.advocate_email ?? "",
      signing_advocate_name: advocate.fullName,
      signing_advocate_email: signingEmail,
      signing_advocate_address: advocate.address,
      signing_advocate_mobile: advocate.mobile,
      advocate_source: advocate.source,
      lead_id: client.lead_id,
    },
  };
}

export async function saveClientNotice(
  input: SaveClientNoticeInput
): Promise<ActionResult<{ noticeId: string }>> {
  const user = await requireUserWithRole(["admin", "employee"]);
  const parsed = saveClientNoticeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Invalid notice data",
    };
  }

  const supabase = await createClient();
  const access = await assertClientAccess(
    supabase,
    parsed.data.client_onboarding_id,
    user.id,
    user.role
  );
  if (!access.ok) return { success: false, error: access.error };

  const client = access.client;
  const advocate = await resolveSigningAdvocate(supabase, {
    leadId: client.lead_id,
    fallbackName: client.advocate_name ?? "",
    fallbackEmail: client.advocate_email,
  });

  let signingEmail = advocate.email;
  if (advocate.profileId) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const { data: authUser } = await admin.auth.admin.getUserById(advocate.profileId);
      signingEmail = authUser?.user?.email ?? signingEmail;
    } catch {
      // keep fallback
    }
  }

  const reasonRows = buildReasonParagraphs(
    parsed.data.reason_keys,
    parsed.data.additional_reason
  );
  const reason_texts = reasonRows.map((r) => `${r.letter} ${r.text}`);

  const fieldCfg = getTemplateFieldConfig(parsed.data.template_type);
  const criminalCharges = fieldCfg?.showDefamationFields
    ? DEFAMATION_CRIMINAL_CHARGES_RS
    : parsed.data.criminal_charges_payment_rs?.trim() || null;

  const payload = {
    ...parsed.data,
    criminal_charges_payment_rs: criminalCharges,
    client_name: client.client_name,
    client_id: client.client_id,
    signing_advocate_name: advocate.fullName,
    signing_advocate_email: signingEmail,
    signing_advocate_address: advocate.address,
    signing_advocate_mobile: advocate.mobile,
    advocate_source: advocate.source,
  };

  // REF stored as plain CLID; /MON/YYYY appended only when generating the doc.
  // Templates without CLID ref (Pre-Arb / Loan Recall) store Notice No as letter Ref.
  const refBase = stripClidRefSuffix(
    (client.client_id ?? parsed.data.ref_number).trim()
  );
  const refNumber =
    fieldCfg?.showRefNumber === false
      ? parsed.data.notice_no.trim() || stripClidRefSuffix(parsed.data.ref_number.trim())
      : refBase || stripClidRefSuffix(parsed.data.ref_number.trim());
  const referenceOnNotice =
    parsed.data.reference_number_on_notice?.trim() ||
    (fieldCfg?.showRefNumber === false ? refNumber : refBase) ||
    parsed.data.notice_no.trim();

  const { data: row, error } = await supabase
    .from("client_notices")
    .insert({
      client_onboarding_id: parsed.data.client_onboarding_id,
      created_by: user.id,
      advocate_profile_id: advocate.profileId,
      template_type: parsed.data.template_type,
      notice_no: parsed.data.notice_no.trim(),
      notice_date: parsed.data.notice_date,
      expiry_date: parsed.data.expiry_date,
      loan_id_bearing_no: parsed.data.loan_id_bearing_no.trim(),
      ref_number: refNumber,
      reply_to_name: parsed.data.reply_to_name.trim(),
      reply_to_address: parsed.data.reply_to_address.trim(),
      reason_keys: parsed.data.reason_keys,
      reason_texts,
      additional_reason: parsed.data.additional_reason?.trim() || null,
      copy_to_advocate: parsed.data.copy_to_advocate,
      copy_to_advocate_name: parsed.data.copy_to_advocate
        ? parsed.data.copy_to_advocate_name?.trim() || null
        : null,
      copy_to_advocate_address: parsed.data.copy_to_advocate
        ? parsed.data.copy_to_advocate_address?.trim() || null
        : null,
      reference_number_on_notice: referenceOnNotice,
      signature_mode: parsed.data.signature_mode,
      enable_dates: parsed.data.enable_dates,
      signing_advocate_name: advocate.fullName,
      signing_advocate_email: signingEmail,
      payload: {
        ...payload,
        ref_number: refNumber,
        reference_number_on_notice: referenceOnNotice,
        client_ro: parsed.data.client_ro?.trim() || null,
        loan_of_rs: parsed.data.loan_of_rs?.trim() || null,
        emis_amounting_to_rs: parsed.data.emis_amounting_to_rs?.trim() || null,
        criminal_charges_payment_rs: criminalCharges,
      },
    })
    .select("id")
    .single();

  if (error || !row) {
    if (error) console.error("[notices] save failed", error.message);
    return { success: false, error: "Failed to save notice" };
  }

  revalidatePath("/employee/dashboard");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${parsed.data.client_onboarding_id}`);
  revalidatePath(`/employee/clients/${parsed.data.client_onboarding_id}`);
  if (client.submitted_by) {
    revalidatePath(`/admin/employees/${client.submitted_by}`);
  }

  return { success: true, data: { noticeId: row.id as string } };
}
