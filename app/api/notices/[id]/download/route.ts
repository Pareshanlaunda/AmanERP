import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertClientAccess } from "@/lib/auth/client-access";
import { getUserWithRole } from "@/lib/auth/get-user";
import {
  isNoticeDownloadRateLimitedAsync,
  recordNoticeDownloadAttemptAsync,
} from "@/lib/auth/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  generateNoticeDocx,
  generateNoticePdf,
  generateNoticeXlsx,
  type NoticeMergeInput,
} from "@/lib/notices/generate";

export const runtime = "nodejs";

type Format = "docx" | "pdf" | "xlsx";

/** Columns needed to generate a notice — no SELECT *. */
const NOTICE_DOWNLOAD_SELECT =
  "id, client_onboarding_id, template_type, notice_no, notice_date, expiry_date, loan_id_bearing_no, ref_number, reply_to_name, reply_to_address, reason_keys, additional_reason, copy_to_advocate, copy_to_advocate_name, copy_to_advocate_address, reference_number_on_notice, signature_mode, enable_dates, signing_advocate_name, signing_advocate_email, payload";

type NoticeDownloadRow = {
  id: string;
  client_onboarding_id: string;
  template_type: string;
  notice_no: string;
  notice_date: string;
  expiry_date: string;
  loan_id_bearing_no: string;
  ref_number: string;
  reply_to_name: string;
  reply_to_address: string;
  reason_keys: string[] | null;
  additional_reason: string | null;
  copy_to_advocate: boolean;
  copy_to_advocate_name: string | null;
  copy_to_advocate_address: string | null;
  reference_number_on_notice: string | null;
  signature_mode: string | null;
  enable_dates: boolean | null;
  signing_advocate_name: string | null;
  signing_advocate_email: string | null;
  payload: Record<string, unknown> | null;
};

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
  // ASCII fallback + RFC 5987 — no raw user text in headers.
  const asciiName = filename.replace(/[^\w.-]+/g, "_") || "notice";
  const disposition = `${inline ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(asciiName)}`;
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": disposition,
      "Content-Length": String(buf.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
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

    const downloadKey = `notice-dl:${user.id}`;
    if (await isNoticeDownloadRateLimitedAsync(downloadKey)) {
      return NextResponse.json({ error: "Too many downloads. Try again shortly." }, { status: 429 });
    }

    const { id } = await context.params;
    const idParsed = z.string().uuid().safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Invalid notice id" }, { status: 400 });
    }

    const format = (request.nextUrl.searchParams.get("format") ?? "docx") as Format;
    const inline = request.nextUrl.searchParams.get("inline") === "1";

    if (!["docx", "pdf", "xlsx"].includes(format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("client_notices")
      .select(NOTICE_DOWNLOAD_SELECT)
      .eq("id", idParsed.data)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("[notice download] lookup failed", error.message);
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    const notice = data as NoticeDownloadRow;

    const access = await assertClientAccess(
      supabase,
      notice.client_onboarding_id,
      user.id,
      user.role
    );
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    await recordNoticeDownloadAttemptAsync(downloadKey);

    const merge = toMergeInput(notice, access.client.client_name);
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
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
