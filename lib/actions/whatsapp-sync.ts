"use server";

import { requireUserWithRole } from "@/lib/auth/get-user";
import { syncAllWhatsAppLeadsFromBotbiz } from "@/lib/botbiz/sync-subscribers";
import { publicBotbizError } from "@/lib/errors/public-error";
import { revalidatePath } from "next/cache";

/**
 * Admin: paginated Botbiz pull into ERP. Does not cap stored leads — webhook + full sync.
 */
export async function syncWhatsAppLeadsAction(): Promise<{
  success: boolean;
  created: number;
  updated: number;
  pages?: number;
  error?: string;
}> {
  await requireUserWithRole(["admin"]);

  const result = await syncAllWhatsAppLeadsFromBotbiz();
  if (!result.ok) {
    return {
      success: false,
      created: 0,
      updated: 0,
      error: publicBotbizError(result.error),
    };
  }

  if (result.created > 0 || result.updated > 0) {
    revalidatePath("/admin/dashboard");
  }

  return {
    success: true,
    created: result.created,
    updated: result.updated,
    pages: result.pages,
  };
}
