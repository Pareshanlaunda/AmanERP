import { NextRequest, NextResponse } from "next/server";
import { getUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import {
  generateNoticeDocx,
  generateNoticePdf,
  generateNoticeXlsx,
  type NoticeMergeInput,
} from "@/lib/notices/generate";

export const runtime = "nodejs";

type Format = "docx" | "pdf" | "xlsx";

function toMergeInput(row: Record<string, unknown>, clientName: string): NoticeMergeInput {
  const noticeDate = String(row.notice_date ?? "").slice(0, 10);
  const expiryDate = String(row.expiry_date ?? "").slice(0, 10);
  const payload = (row.payload as Record<string, unknown> | null) ?? {};

  return {
    template_type: String(row.template_type),
    notice_no: String(row.notice_no),
    notice_date: noticeDate,
    expiry_date: expiryDate,
    loan_id_bearing_no: String(row.loan_id_bearing_no),
    ref_number: String(row.ref_number),
    reply_to_name: String(row.reply_to_name),
    reply_to_address: String(row.reply_to_address),
    reason_keys: (row.reason_keys as string[]) ?? [],
    additional_reason: (row.additional_reason as string | null) ?? null,
    copy_to_advocate: Boolean(row.copy_to_advocate),
    copy_to_advocate_name: (row.copy_to_advocate_name as string | null) ?? null,
    copy_to_advocate_address: (row.copy_to_advocate_address as string | null) ?? null,
    reference_number_on_notice: String(row.reference_number_on_notice ?? ""),
    signature_mode: row.signature_mode === "manual" ? "manual" : "digital",
    enable_dates: Boolean(row.enable_dates),
    client_name: clientName,
    signing_advocate_name: String(row.signing_advocate_name ?? ""),
    signing_advocate_email: (row.signing_advocate_email as string | null) ?? null,
    signing_advocate_address:
      (payload.signing_advocate_address as string | null | undefined) ?? null,
    signing_advocate_mobile:
      (payload.signing_advocate_mobile as string | null | undefined) ?? null,
    client_ro: (payload.client_ro as string | null | undefined) ?? null,
    loan_of_rs: (payload.loan_of_rs as string | null | undefined) ?? null,
    emis_amounting_to_rs:
      (payload.emis_amounting_to_rs as string | null | undefined) ?? null,
    criminal_charges_payment_rs:
      (payload.criminal_charges_payment_rs as string | null | undefined) ?? null,
    agent_behavior: Boolean(payload.agent_behavior),
    intimation_mail_date:
      (payload.intimation_mail_date as string | null | undefined) ?? null,
  };
}

function fileResponse(buf: Buffer, contentType: string, filename: string, inline: boolean) {
  const disposition = inline
    ? `inline; filename="${filename}"`
    : `attachment; filename="${filename}"`;
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": disposition,
      "Content-Length": String(buf.length),
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const format = (request.nextUrl.searchParams.get("format") ?? "docx") as Format;
    const inline = request.nextUrl.searchParams.get("inline") === "1";

    if (!["docx", "pdf", "xlsx"].includes(format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: notice, error } = await supabase
      .from("client_notices")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !notice) {
      return NextResponse.json(
        { error: error?.message ?? "Notice not found" },
        { status: 404 }
      );
    }

    const { data: client } = await supabase
      .from("client_onboardings")
      .select("id, client_name, submitted_by, lead_id")
      .eq("id", notice.client_onboarding_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (user.role !== "admin") {
      let allowed = client.submitted_by === user.id;
      if (!allowed && client.lead_id) {
        const { data: lead } = await supabase
          .from("leads")
          .select("assigned_to")
          .eq("id", client.lead_id)
          .maybeSingle();
        const { data: extra } = await supabase
          .from("lead_additional_assignees")
          .select("employee_id")
          .eq("lead_id", client.lead_id)
          .eq("employee_id", user.id)
          .maybeSingle();
        allowed = lead?.assigned_to === user.id || Boolean(extra);
      }
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const merge = toMergeInput(notice as Record<string, unknown>, client.client_name);
    const safeName = String(notice.notice_no).replace(/[^\w.-]+/g, "_") || "notice";

    if (format === "docx") {
      const buf = generateNoticeDocx(merge);
      return fileResponse(
        buf,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        `${safeName}.docx`,
        false
      );
    }
    if (format === "pdf") {
      const buf = await generateNoticePdf(merge);
      return fileResponse(buf, "application/pdf", `${safeName}.pdf`, inline);
    }
    const buf = await generateNoticeXlsx({ ...merge, id: notice.id });
    return fileResponse(
      buf,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      `${safeName}.xlsx`,
      false
    );
  } catch (e) {
    console.error("[notice download]", e);
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
