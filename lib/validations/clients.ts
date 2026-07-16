import { z } from "zod";

export const assignClientSchema = z.object({
  client_id: z.string().uuid(),
  submitted_by: z.string().uuid(),
  /** When set (employee removal handoff), update only if owner is still this employee. */
  from_owner_id: z.string().uuid().optional(),
  additional_assignee_ids: z.array(z.string().uuid()).optional(),
  /** When true (default), also sync linked lead primary + additional assignees. */
  sync_lead: z.boolean().optional().default(true),
});

export type AssignClientInput = z.infer<typeof assignClientSchema>;
