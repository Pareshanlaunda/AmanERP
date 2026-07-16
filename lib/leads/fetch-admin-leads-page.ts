import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead } from "@/lib/types/database";
import { listAdditionalAssigneeIdsForLeads } from "@/lib/leads/assignees";
import {
  ADMIN_DASHBOARD_LEAD_SELECT,
  ADMIN_LEAD_SEARCH_MIN_CHARS,
  ADMIN_LEADS_MAX_PAGE_SIZE,
  DASHBOARD_LEADS_PAGE_SIZE,
} from "@/lib/leads/dashboard-limits";
import { leadSearchIlikePattern, sanitizeLeadSearchQuery } from "@/lib/leads/search-query";

export type FetchAdminLeadsPageParams = {
  page?: number;
  pageSize?: number;
  query?: string;
  /** inbox = admin triage (status new). all = full CRM registry. */
  queue?: "inbox" | "all";
};

export type FetchAdminLeadsPageResult = {
  leads: Lead[];
  totalCount: number;
  page: number;
  pageSize: number;
};

const LEAD_SEARCH_OR = (pattern: string) =>
  `client_name.ilike.${pattern},client_phone.ilike.${pattern},client_email.ilike.${pattern},client_alternate_phone.ilike.${pattern},notes.ilike.${pattern}`;

/** Shared paginated lead query — CRM list view (browse + search). */
export async function fetchAdminLeadsPage(
  supabase: SupabaseClient,
  params?: FetchAdminLeadsPageParams
): Promise<FetchAdminLeadsPageResult> {
  const requestedPage = Math.max(1, Math.floor(params?.page ?? 1));
  const pageSize = Math.min(
    ADMIN_LEADS_MAX_PAGE_SIZE,
    Math.max(1, Math.floor(params?.pageSize ?? DASHBOARD_LEADS_PAGE_SIZE))
  );

  const rawQuery = params?.query?.trim() ?? "";
  const sanitized = sanitizeLeadSearchQuery(rawQuery);
  const isSearch = sanitized.length >= ADMIN_LEAD_SEARCH_MIN_CHARS;
  const pattern = isSearch ? leadSearchIlikePattern(sanitized) : null;
  const queue = params?.queue === "all" ? "all" : "inbox";

  const applyQueue = <T extends { eq: (col: string, val: string) => T }>(builder: T): T => {
    if (queue === "inbox") {
      return builder.eq("status", "new");
    }
    return builder;
  };

  let countQuery = supabase.from("leads").select("id", { count: "exact", head: true });
  countQuery = applyQueue(countQuery);
  if (pattern) {
    countQuery = countQuery.or(LEAD_SEARCH_OR(pattern));
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw countError;
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = totalCount === 0 ? 1 : Math.min(requestedPage, totalPages);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let pageQuery = supabase.from("leads").select(ADMIN_DASHBOARD_LEAD_SELECT);
  pageQuery = applyQueue(pageQuery);
  if (pattern) {
    pageQuery = pageQuery.or(LEAD_SEARCH_OR(pattern));
  }

  const { data, error } = await pageQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Lead[];
  const assigneeMap = await listAdditionalAssigneeIdsForLeads(
    supabase,
    rows.map((l) => l.id)
  );

  return {
    leads: rows.map((lead) => ({
      ...lead,
      additional_assignee_ids: assigneeMap.get(lead.id) ?? [],
    })),
    totalCount,
    page,
    pageSize,
  };
}
