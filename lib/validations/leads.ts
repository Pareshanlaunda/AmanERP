import { z } from "zod";

export const loanTypeSchema = z.enum(["secured", "unsecured", "both"]);
export const employeeTypeSchema = z.enum(["advocate", "csa", "hr", "director", "finance", "general"]);

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

export type AssignLeadInput = z.infer<typeof assignLeadSchema>;
export type AddLeadUpdateInput = z.infer<typeof addLeadUpdateSchema>;

export {
  LOAN_TYPE_OPTIONS,
  PERSONAL_LOAN_RANGE_OPTIONS,
  CREDIT_CARD_RANGE_OPTIONS,
  RECOVERY_HARASSMENT_OPTIONS,
  CLIENT_DETAILS_LABELS,
} from "@/lib/leads/client-details-fields";
