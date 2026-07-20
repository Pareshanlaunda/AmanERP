"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { listAdminClientsPage } from "@/lib/actions/clients";
import {
  ADMIN_CLIENT_SEARCH_MIN_CHARS,
  ADMIN_CLIENTS_PAGE_SIZE,
} from "@/lib/clients/dashboard-limits";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { ClientsTable } from "@/components/dashboard/clients-table";
import { SearchBar } from "@/components/dashboard/search-bar";
import { TablePagination } from "@/components/shared/table-pagination";

type AdminClientsPanelProps = {
  initialClients: ClientOnboarding[];
  initialTotalCount: number;
  initialOwnerNames: Record<string, string>;
  initialNoticeIds: Record<string, string>;
  pageSize?: number;
};

export function AdminClientsPanel({
  initialClients,
  initialTotalCount,
  initialOwnerNames,
  initialNoticeIds,
  pageSize = ADMIN_CLIENTS_PAGE_SIZE,
}: AdminClientsPanelProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [clients, setClients] = useState(initialClients);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [ownerNames, setOwnerNames] = useState(initialOwnerNames);
  const [noticeIds, setNoticeIds] = useState(initialNoticeIds);
  const [isLoading, startLoad] = useTransition();
  const skipInitialFetchRef = useRef(true);

  const trimmedQuery = query.trim();
  const isSearch = trimmedQuery.length >= ADMIN_CLIENT_SEARCH_MIN_CHARS;

  const fetchPage = useCallback(
    (nextPage: number, search: string) => {
      startLoad(async () => {
        const trimmed = search.trim();
        const useSearch = trimmed.length >= ADMIN_CLIENT_SEARCH_MIN_CHARS;
        const result = await listAdminClientsPage({
          page: nextPage,
          pageSize,
          query: useSearch ? trimmed : undefined,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setClients(result.clients);
        setTotalCount(result.totalCount);
        setPage(result.page);
        setOwnerNames(result.ownerNames);
        setNoticeIds(result.latestNoticeIds);
      });
    },
    [pageSize]
  );

  useEffect(() => {
    if (trimmedQuery.length === 1) return;

    if (skipInitialFetchRef.current && !trimmedQuery && page === 1) {
      skipInitialFetchRef.current = false;
      return;
    }

    const timer = window.setTimeout(
      () => fetchPage(page, trimmedQuery),
      isSearch ? 300 : 0
    );
    return () => window.clearTimeout(timer);
  }, [trimmedQuery, isSearch, page, fetchPage]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length !== 1) {
      setPage(1);
    }
  }

  return (
    <div className="space-y-4">
      <SearchBar
        value={query}
        onChange={handleQueryChange}
        placeholder="Search by name, CLID, phone, email, or advocate…"
      />
      {trimmedQuery.length === 1 ? (
        <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
      ) : null}
      <ClientsTable
        clients={clients}
        showClientId
        showOwner
        ownerNames={ownerNames}
        showNotice
        latestNoticeIds={noticeIds}
        viewLinkPrefix="/admin/clients"
        emptyMessage={
          isSearch
            ? "No clients match your search."
            : "No clients onboarded yet."
        }
      />
      <TablePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={(next) => fetchPage(next, query)}
        disabled={isLoading}
        noun="clients"
      />
    </div>
  );
}
