/** Strip PostgREST `.or()` breakers; keep ilike wildcards server-side only. */
export function sanitizeLeadSearchQuery(raw: string): string {
  return raw
    .trim()
    .replace(/[,()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function leadSearchIlikePattern(query: string): string {
  const safe = sanitizeLeadSearchQuery(query).replace(/[%_\\]/g, "");
  return `%${safe}%`;
}
