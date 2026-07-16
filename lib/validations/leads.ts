import { z } from "zod";
import { harassmentFacedSchema } from "@/lib/validations/harassment";

export const loanTypeSchema = z.enum(["secured", "unsecured", "both"]);
export const employeeTypeSchema = z.enum(["advocate", "csa", "hr", "director", "finance", "general"]);

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(32, "Phone number is too long")
  .optional()
  .or(z.literal(""));

const optionalEmailSchema = z
  .string()
  .trim()
  .max(254, "Email is too long")
  .email("Invalid email")
  .optional()
  .or(z.literal(""));

export const createLeadSchema = z.object({
  client_name: z.string().trim().min(1, "Client name is required").max(200, "Name is too long"),
  client_phone: optionalPhoneSchema,
  client_alternate_phone: optionalPhoneSchema,
  client_email: optionalEmailSchema,
  loan_amount: z.number().min(0, "Loan amount must be 0 or greater").optional(),
  personal_loan_amount_range: z.string().trim().max(64).optional().or(z.literal("")),
  credit_card_amount_range: z.string().trim().max(64).optional().or(z.literal("")),
  loan_type: loanTypeSchema.optional(),
  harassment_faced: harassmentFacedSchema.optional(),
  notes: z.string().trim().max(4000, "Notes are too long").optional().or(z.literal("")),
  assigned_to: z.string().uuid().optional(),
  additional_assignee_ids: z.array(z.string().uuid()).optional(),
  assignment_comment: z.string().trim().max(2000, "Comment is too long").optional().or(z.literal("")),
});

export const assignLeadSchema = z.object({
  lead_id: z.string().uuid(),
  assigned_to: z.string().uuid(),
  additional_assignee_ids: z.array(z.string().uuid()).optional(),
  assignment_comment: z.string().optional(),
});

export const addLeadUpdateSchema = z.object({
  lead_id: z.string().uuid(),
  note: z.string().min(1, "Update note is required"),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;
export type AddLeadUpdateInput = z.infer<typeof addLeadUpdateSchema>;

export {
  LOAN_TYPE_OPTIONS,
  PERSONAL_LOAN_RANGE_OPTIONS,
  CREDIT_CARD_RANGE_OPTIONS,
  RECOVERY_HARASSMENT_OPTIONS,
  CLIENT_DETAILS_LABELS,
} from "@/lib/leads/client-details-fields";
