import { z } from "zod";
import { NOTICE_REASON_OPTIONS } from "@/lib/notices/reason-options";
import { ACTIVE_NOTICE_TEMPLATE_TYPES } from "@/lib/notices/template-types";
import { getTemplateFieldConfig } from "@/lib/notices/template-fields";

const reasonKeySet = new Set(NOTICE_REASON_OPTIONS.map((o) => o.key));

export const noticeSignatureModeSchema = z.enum(["digital", "manual"]);

export const saveClientNoticeSchema = z
  .object({
    client_onboarding_id: z.string().uuid(),
    template_type: z.enum(
      ACTIVE_NOTICE_TEMPLATE_TYPES as unknown as [string, ...string[]]
    ),
    notice_no: z.string().min(1, "Notice No is required"),
    notice_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Notice Date must be YYYY-MM-DD"),
    expiry_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry Date must be YYYY-MM-DD"),
    loan_id_bearing_no: z.string().min(1, "Loan ID Bearing No is required"),
    ref_number: z.string().min(1, "Ref Number is required"),
    reply_to_name: z.string().min(1, "Reply To Name is required"),
    reply_to_address: z.string().min(1, "Reply To Address is required"),
    reason_keys: z.array(z.string()).default([]),
    additional_reason: z.string().optional().nullable(),
    copy_to_advocate: z.boolean().default(false),
    copy_to_advocate_name: z.string().optional().nullable(),
    copy_to_advocate_address: z.string().optional().nullable(),
    reference_number_on_notice: z.string().optional().nullable(),
    signature_mode: noticeSignatureModeSchema,
    enable_dates: z.boolean().default(false),
    /** Defamation: Client R/O */
    client_ro: z.string().optional().nullable(),
    /** Defamation: loan of Rs. */
    loan_of_rs: z.string().optional().nullable(),
    /** Defamation: EMI's amounting to Rs. */
    emis_amounting_to_rs: z.string().optional().nullable(),
    /** Defamation: criminal charges payment of the Rs. */
    criminal_charges_payment_rs: z.string().optional().nullable(),
    /** Loan recall: Agent Behavior → point 8 */
    agent_behavior: z.boolean().default(false),
    /** Loan recall: Intimation Mail Date → point 3 */
    intimation_mail_date: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const cfg = getTemplateFieldConfig(data.template_type);

    if (data.notice_date && data.expiry_date && data.expiry_date < data.notice_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiry Date must be on or after Notice Date",
        path: ["expiry_date"],
      });
    }

    for (const key of data.reason_keys) {
      if (!reasonKeySet.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid reason: ${key}`,
          path: ["reason_keys"],
        });
      }
    }

    if (cfg?.showCopyToAdvocate && data.copy_to_advocate) {
      if (!data.copy_to_advocate_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Copy To Advocate Name is required",
          path: ["copy_to_advocate_name"],
        });
      }
      if (!data.copy_to_advocate_address?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Copy To Advocate Address is required",
          path: ["copy_to_advocate_address"],
        });
      }
    }

    if (cfg?.showReferenceOnNotice && !data.reference_number_on_notice?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reference number on the notice received is required",
        path: ["reference_number_on_notice"],
      });
    }

    if (cfg?.showDefamationFields) {
      if (!data.client_ro?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Client R/O is required",
          path: ["client_ro"],
        });
      }
      if (!data.loan_of_rs?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "loan of Rs is required",
          path: ["loan_of_rs"],
        });
      }
      if (!data.emis_amounting_to_rs?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "EMI's amounting to Rs is required",
          path: ["emis_amounting_to_rs"],
        });
      }
      // criminal_charges_payment_rs is fixed at 50000 — not required from form
    }

    if (cfg?.showIntimationMailDate && !data.intimation_mail_date?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Intimation Mail Date is required",
        path: ["intimation_mail_date"],
      });
    }
  });

export type SaveClientNoticeInput = z.infer<typeof saveClientNoticeSchema>;
