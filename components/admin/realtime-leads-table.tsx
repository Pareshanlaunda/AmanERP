"use client";

import { useCallback, useMemo } from "react";
import type { Lead, Profile } from "@/lib/types/database";
import { filterLeads } from "@/lib/filters/list-search";
import { isActiveEmployeeLead } from "@/lib/filters/employee-leads";
import { useRealtimeRows } from "@/lib/hooks/use-realtime-rows";
import { LeadsTable } from "@/components/admin/leads-table";

type RealtimeLeadsTableProps = {
  initialLeads: Lead[];
  employees: Profile[];
  linkPrefix?: string;
  hideAssignedColumn?: boolean;
  mode?: "admin" | "employee-assigned";
  userId?: string;
  searchQuery?: string;
  /** When true, search already ran on server (full DB). */
  skipClientFilter?: boolean;
  loading?: boolean;
};

export function RealtimeLeadsTable({
  initialLeads,
  employees,
  linkPrefix,
  hideAssignedColumn,
  mode = "admin",
  userId,
  searchQuery = "",
  skipClientFilter = false,
  loading = false,
}: RealtimeLeadsTableProps) {
  const includeRow = useCallback(
    (lead: Lead) => {
      if (mode === "employee-assigned" && userId) {
        return isActiveEmployeeLead(lead, userId);
      }
      return true;
    },
    [mode, userId]
  );

  const leads = useRealtimeRows({
    table: "leads",
    initialRows: initialLeads,
    channelName: mode === "employee-assigned" ? `leads:employee-table:${userId}` : "leads:admin",
    sortBy: mode === "employee-assigned" ? "assigned_at" : "created_at",
    sortDescending: true,
    includeRow,
  });

  const filteredLeads = useMemo(
    () => (skipClientFilter ? leads : filterLeads(leads, searchQuery)),
    [leads, searchQuery, skipClientFilter]
  );

  if (loading) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Searching leads…
      </div>
    );
  }

  return (
    <LeadsTable
      leads={filteredLeads}
      employees={employees}
      linkPrefix={linkPrefix}
      hideAssignedColumn={hideAssignedColumn}
      emptyMessage={
        leads.length > 0 && filteredLeads.length === 0
          ? "No leads match your search."
          : undefined
      }
    />
  );
}
