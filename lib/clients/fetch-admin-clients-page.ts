import type { SupabaseClient } from "@supabase/supabase-js";
import { attachLeadSourcesToClients } from "@/lib/leads/attach-lead-sources";
import {
  leadSearchIlikePattern,
  sanitizeLeadSearchQuery,
} from "@/lib/leads/search-query";
import {
  ADMIN_CLIENT_SEARCH_MIN_CHARS,
  ADMIN_CLIENTS_LIST_SELECT,
  ADMIN_CLIENTS_MAX_PAGE_SIZE,
  ADMIN_CLIENTS_PAGE_SIZE,
} from "@/lib/clients/dashboard-limits";
import type { ClientOnboarding } from "@/lib/validations/onboarding";

export type FetchAdminClientsPageParams = {
  page?: number;
  pageSize?: number;
  query?: string;
};

export type FetchAdminClientsPageResult = {
  clients: ClientOnboarding[];
  totalCount: number;
  page: number;
  pageSize: number;
  /** submitted_by profile id → display name */
  ownerNames: Record<string, string>;
};

const CLIENT_SEARCH_OR = (pattern: string) =>
  [
    `client_name.ilike.${pattern}`,
    `client_id.ilike.${pattern}`,
    `client_email.ilike.${pattern}`,
    `client_contact_number.ilike.${pattern}`,
    `advocate_name.ilike.${pattern}`,
  ].join(",");

/** Paginated admin client registry — browse + server search (CRM list norm). */
export async function fetchAdminClientsPage(
  supabase: SupabaseClient,
  params?: FetchAdminClientsPageParams
): Promise<FetchAdminClientsPageResult> {
  const requestedPage = Math.max(1, Math.floor(params?.page ?? 1));
  const pageSize = Math.min(
    ADMIN_CLIENTS_MAX_PAGE_SIZE,
    Math.max(1, Math.floor(params?.pageSize ?? ADMIN_CLIENTS_PAGE_SIZE))
  );

  const sanitized = sanitizeLeadSearchQuery(params?.query ?? "");
  const isSearch = sanitized.length >= ADMIN_CLIENT_SEARCH_MIN_CHARS;
  const pattern = isSearch ? leadSearchIlikePattern(sanitized) : null;

  let countQuery = supabase
    .from("client_onboardings")
    .select("id", { count: "exact", head: true });
  if (pattern) {
    countQuery = countQuery.or(CLIENT_SEARCH_OR(pattern));
  }

  const { count, error: countError } = await countQuery;
  if (countError) throw countError;

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = totalCount === 0 ? 1 : Math.min(requestedPage, totalPages);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let pageQuery = supabase.from("client_onboardings").select(ADMIN_CLIENTS_LIST_SELECT);
  if (pattern) {
    pageQuery = pageQuery.or(CLIENT_SEARCH_OR(pattern));
  }

  const { data, error } = await pageQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const rows = (data ?? []) as ClientOnboarding[];
  const clients = await attachLeadSourcesToClients(supabase, rows);

  const ownerIds = [
    ...new Set(clients.map((c) => c.submitted_by).filter(Boolean)),
  ] as string[];
  const ownerNames: Record<string, string> = {};
  if (ownerIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ownerIds);
    if (profileError) {
      console.error("[admin-clients] owner lookup failed", profileError.message);
    } else {
      for (const p of profiles ?? []) {
        ownerNames[p.id as string] = (p.full_name as string) || "—";
      }
    }
  }

  return { clients, totalCount, page, pageSize, ownerNames };
}
