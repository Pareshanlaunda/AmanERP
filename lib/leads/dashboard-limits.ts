/** Rows per admin dashboard page — browse full lead set via pagination. */
export const DASHBOARD_LEADS_PAGE_SIZE = 40;
/** @deprecated use DASHBOARD_LEADS_PAGE_SIZE */
export const DASHBOARD_RECENT_LEADS_LIMIT = DASHBOARD_LEADS_PAGE_SIZE;

export const ADMIN_DASHBOARD_LEAD_SELECT =
  "id, client_name, client_phone, source, status, preferred_language, assigned_to, created_at, assigned_at, updated_at";

export const ADMIN_LEAD_SEARCH_MIN_CHARS = 2;
export const ADMIN_LEAD_SEARCH_MAX_QUERY_LEN = 80;
export const ADMIN_LEADS_MAX_PAGE_SIZE = 100;

/** Botbiz manual sync: pages × page size (API max 100/page). */
export const BOTBIZ_SYNC_PAGE_SIZE = 100;
export const BOTBIZ_SYNC_MAX_PAGES = 50;

/** Background catch-up on dashboard visit — small, non-blocking. */
export const BOTBIZ_BACKGROUND_SYNC_LIMIT = 40;
