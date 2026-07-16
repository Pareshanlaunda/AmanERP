"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Lead, Profile } from "@/lib/types/database";
import { listAdminLeadsPage } from "@/lib/actions/leads";
import { syncWhatsAppLeadsAction } from "@/lib/actions/whatsapp-sync";
import { CollapsiblePanel } from "@/components/shared/collapsible-panel";
import { LeadsTable } from "@/components/admin/leads-table";
import { TablePagination } from "@/components/shared/table-pagination";
import { Button } from "@/components/ui/button";
import {
  ADMIN_LEAD_SEARCH_MIN_CHARS,
  DASHBOARD_LEADS_PAGE_SIZE,
} from "@/lib/leads/dashboard-limits";

type LeadQueue = "inbox" | "all";

type DashboardRecentLeadsProps = {
  initialLeads: Lead[];
  employees: Profile[];
  /** All leads in CRM (assigned + unassigned). */
  totalLeadCount: number;
  /** Unassigned triage count (status new). */
  initialInboxCount: number;
  pageSize?: number;
};

export function DashboardRecentLeads({
  initialLeads,
  employees,
  totalLeadCount,
  initialInboxCount,
  pageSize = DASHBOARD_LEADS_PAGE_SIZE,
}: DashboardRecentLeadsProps) {
  const router = useRouter();
  const [queue, setQueue] = useState<LeadQueue>("inbox");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState(initialLeads);
  const [resultCount, setResultCount] = useState(initialInboxCount);
  const [inboxCount, setInboxCount] = useState(initialInboxCount);
  const [crmTotal] = useState(totalLeadCount);
  const [isLoading, startLoad] = useTransition();
  const [isSyncPending, startSync] = useTransition();
  const skipInitialFetchRef = useRef(true);

  const trimmedQuery = query.trim();
  const isSearch = trimmedQuery.length >= ADMIN_LEAD_SEARCH_MIN_CHARS;

  const fetchPage = useCallback(
    (nextPage: number, search: string, activeQueue: LeadQueue) => {
      startLoad(async () => {
        const trimmed = search.trim();
        const useSearch = trimmed.length >= ADMIN_LEAD_SEARCH_MIN_CHARS;
        const result = await listAdminLeadsPage({
          page: nextPage,
          pageSize,
          queue: useSearch ? "all" : activeQueue,
          query: useSearch ? trimmed : undefined,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setLeads(result.leads);
        setResultCount(result.totalCount);
        setPage(result.page);
        if (!useSearch && activeQueue === "inbox") {
          setInboxCount(result.totalCount);
        }
      });
    },
    [pageSize]
  );

  useEffect(() => {
    if (trimmedQuery.length === 1) {
      return;
    }

    // SSR already loaded inbox page 1 — don't duplicate on first mount.
    if (
      skipInitialFetchRef.current &&
      !trimmedQuery &&
      queue === "inbox" &&
      page === 1
    ) {
      skipInitialFetchRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      fetchPage(page, trimmedQuery, queue);
    }, isSearch ? 300 : 0);

    return () => window.clearTimeout(timer);
  }, [trimmedQuery, isSearch, queue, page, fetchPage]);

  const subtitle = useMemo(() => {
    const allLabel = crmTotal.toLocaleString();
    if (isSearch) {
      if (isLoading && leads.length === 0) return "Searching all leads…";
      return `${resultCount.toLocaleString()} match${resultCount === 1 ? "" : "es"} · ${allLabel} total in CRM`;
    }
    if (queue === "inbox") {
      return `${inboxCount.toLocaleString()} need assignment · ${allLabel} total in CRM`;
    }
    return `${allLabel} lead${crmTotal === 1 ? "" : "s"} in CRM · assigned leads stay in registry`;
  }, [isSearch, isLoading, leads.length, resultCount, crmTotal, queue, inboxCount]);

  function handlePageChange(nextPage: number) {
    fetchPage(nextPage, query, queue);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length !== 1) {
      setPage(1);
    }
  }

  function handleQueueChange(next: LeadQueue) {
    setQueue(next);
    setPage(1);
    setQuery("");
  }

  function handleSync() {
    startSync(async () => {
      const result = await syncWhatsAppLeadsAction();
      if (!result.success) {
        toast.error(result.error ?? "WhatsApp sync failed");
        return;
      }
      if (result.created === 0 && result.updated === 0) {
        toast.message("WhatsApp contacts already up to date");
        return;
      }
      toast.success(
        `Synced WhatsApp: ${result.created} new lead${result.created === 1 ? "" : "s"}` +
          (result.updated ? `, ${result.updated} updated` : "")
      );
      router.refresh();
      fetchPage(page, query, queue);
    });
  }

  const showSearchHint = trimmedQuery.length === 1;

  const panelTitle = isSearch ? "Search leads" : queue === "inbox" ? "Lead inbox" : "All leads";

  return (
    <CollapsiblePanel
      title={panelTitle}
      subtitle={subtitle}
      search={{
        value: query,
        onChange: handleQueryChange,
        placeholder: "Search all leads by name, phone, email, or notes…",
      }}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild type="button" variant="default" size="sm">
            <Link href="/admin/leads/new">Add lead</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSyncPending}
            onClick={handleSync}
          >
            {isSyncPending ? "Syncing all…" : "Sync WhatsApp"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {!isSearch && queue === "inbox" && (
          <p className="text-sm text-muted-foreground">
            Unassigned only. After you assign, the lead leaves this inbox — employee works it below;
            use <span className="font-medium text-foreground">All leads</span> if admin needs to find it again.
          </p>
        )}

        {!isSearch && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={queue === "inbox" ? "default" : "outline"}
              onClick={() => handleQueueChange("inbox")}
            >
              Needs assignment ({inboxCount.toLocaleString()})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={queue === "all" ? "default" : "outline"}
              onClick={() => handleQueueChange("all")}
            >
              All leads ({crmTotal.toLocaleString()})
            </Button>
          </div>
        )}

        {showSearchHint && (
          <p className="text-sm text-muted-foreground">
            Type at least {ADMIN_LEAD_SEARCH_MIN_CHARS} characters to search all leads.
          </p>
        )}

        {isLoading && leads.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Loading leads…
          </div>
        ) : (
          <div className={isLoading ? "pointer-events-none opacity-60" : undefined}>
            <LeadsTable
              leads={leads}
              employees={employees}
              emptyMessage={
                isSearch
                  ? "No leads match your search."
                  : queue === "inbox"
                    ? "Inbox clear — no unassigned leads."
                    : "No leads yet. Add one or sync WhatsApp."
              }
            />
          </div>
        )}
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalCount={resultCount}
          onPageChange={handlePageChange}
          disabled={isLoading}
          noun={isSearch ? "matches" : queue === "inbox" ? "unassigned leads" : "leads"}
        />
      </div>
    </CollapsiblePanel>
  );
}
