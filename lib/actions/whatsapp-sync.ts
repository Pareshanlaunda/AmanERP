"use server";

import { requireUserWithRole } from "@/lib/auth/get-user";
import { syncRecentWhatsAppLeadsFromBotbiz } from "@/lib/botbiz/sync-subscribers";
import { revalidatePath } from "next/cache";

/**
 * Admin: pull recent Botbiz WhatsApp contacts into ERP as leads.
 * Safe to call often — createWhatsAppLeadFromPayload dedupes by phone/subscriber.
 */
export async function syncWhatsAppLeadsAction(): Promise<{
  success: boolean;
  created: number;
  updated: number;
  error?: string;
}> {
  await requireUserWithRole(["admin"]);

  const result = await syncRecentWhatsAppLeadsFromBotbiz({ limit: 40 });
  if (!result.ok) {
    return { success: false, created: 0, updated: 0, error: result.error };
  }

  if (result.created > 0 || result.updated > 0) {
    revalidatePath("/admin/dashboard");
  }

  return {
    success: true,
    created: result.created,
    updated: result.updated,
  };
}
