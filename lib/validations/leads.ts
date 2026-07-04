import { z } from "zod";
import { harassmentFacedSchema } from "@/lib/validations/harassment";

export const loanTypeSchema = z.enum(["personal_business", "credit_card", "both"]);
export const employeeTypeSchema = z.enum(["advocate", "csa", "hr", "director", "finance", "general"]);

export const createLeadSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  client_phone: z.string().optional(),
  client_alternate_phone: z.string().optional(),
  client_email: z.string().email().optional().or(z.literal("")),
  loan_amount: z.number().min(0, "Loan amount must be 0 or greater").optional(),
  loan_type: loanTypeSchema.optional(),
  harassment_faced: harassmentFacedSchema.optional(),
  notes: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  assignment_comment: z.string().optional(),
});

export const assignLeadSchema = z.object({
  lead_id: z.string().uuid(),
  assigned_to: z.string().uuid(),
  assignment_comment: z.string().optional(),
});

export const addLeadUpdateSchema = z.object({
  lead_id: z.string().uuid(),
  note: z.string().min(1, "Update note is required"),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;
export type AddLeadUpdateInput = z.infer<typeof addLeadUpdateSchema>;

export const LOAN_TYPE_OPTIONS = [
  { value: "personal_business", label: "Personal Loan / Business Loan" },
  { value: "credit_card", label: "Credit Card" },
  { value: "both", label: "Both" },
] as const;
