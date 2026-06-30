import { z } from "zod";



export const loanTypeSchema = z.enum(["secured", "unsecured", "credit_card"]);



export const createLeadSchema = z.object({

  client_name: z.string().min(1, "Client name is required"),

  client_phone: z.string().optional(),

  client_alternate_phone: z.string().optional(),

  client_email: z.string().email().optional().or(z.literal("")),

  loan_amount: z.number().min(0, "Loan amount must be 0 or greater").optional(),

  loan_type: loanTypeSchema.optional(),

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

export const rejectLeadSchema = z.object({

  lead_id: z.string().uuid(),

  reason: z.string().min(10, "Please provide a detailed reason (min 10 characters)"),

});



export type RejectLeadInput = z.infer<typeof rejectLeadSchema>;



export const LOAN_TYPE_OPTIONS = [

  { value: "secured", label: "Secured" },

  { value: "unsecured", label: "Unsecured" },

  { value: "credit_card", label: "Credit card" },

] as const;

