import { z } from "zod";
import { harassmentFacedSchema } from "@/lib/validations/harassment";

export const loanTypeSchema = z.enum(["secured", "unsecured", "both"]);
export const employeeTypeSchema = z.enum(["advocate", "csa", "hr", "director", "finance", "general"]);

export const createLeadSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  client_phone: z.string().optional(),
  client_alternate_phone: z.string().optional(),
  client_email: z.string().email().optional().or(z.literal("")),
  loan_amount: z.number().min(0, "Loan amount must be 0 or greater").optional(),
  personal_loan_amount_range: z.string().optional(),
  credit_card_amount_range: z.string().optional(),
  loan_type: loanTypeSchema.optional(),
  harassment_faced: harassmentFacedSchema.optional(),
  notes: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  additional_assignee_ids: z.array(z.string().uuid()).optional(),
  assignment_comment: z.string().optional(),
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
