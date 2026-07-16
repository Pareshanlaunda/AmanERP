import type { SupabaseClient } from "@supabase/supabase-js";

type WithLeadId = { lead_id: string | null };

/** True only when linked lead is WhatsApp — manual leads never get chat UI. */
export function clientHasWhatsAppChat(client: {
  lead_id?: string | null;
  lead_source?: string | null;
}): boolean {
  return Boolean(client.lead_id && client.lead_source === "whatsapp");
}

/** Attach `lead_source` for client list chat gating (minimal select). */
export async function attachLeadSourcesToClients<T extends WithLeadId>(
  supabase: SupabaseClient,
  clients: T[]
): Promise<(T & { lead_source: string | null })[]> {
  const leadIds = [...new Set(clients.map((c) => c.lead_id).filter(Boolean))] as string[];
  if (leadIds.length === 0) {
    return clients.map((c) => ({ ...c, lead_source: null }));
  }

  const { data, error } = await supabase.from("leads").select("id, source").in("id", leadIds);
  if (error) {
    console.error("[attachLeadSourcesToClients] lookup failed", error.message);
    return clients.map((c) => ({ ...c, lead_source: null }));
  }

  const byId = new Map((data ?? []).map((row) => [row.id as string, row.source as string]));
  return clients.map((c) => ({
    ...c,
    lead_source: c.lead_id ? (byId.get(c.lead_id) ?? null) : null,
  }));
}
