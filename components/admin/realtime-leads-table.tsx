"use client";

import { useCallback } from "react";
import type { Lead, Profile } from "@/lib/types/database";
import { useRealtimeRows } from "@/lib/hooks/use-realtime-rows";
import { LeadsTable } from "@/components/admin/leads-table";

type RealtimeLeadsTableProps = {
  initialLeads: Lead[];
  employees: Profile[];
  linkPrefix?: string;
  hideAssignedColumn?: boolean;
  mode?: "admin" | "employee-assigned";
  userId?: string;
};

function isActiveEmployeeLead(lead: Lead, userId: string) {
  return (
    lead.assigned_to === userId &&
    lead.status !== "converted" &&
    lead.status !== "lost"
  );
}

export function RealtimeLeadsTable({
  initialLeads,
  employees,
  linkPrefix,
  hideAssignedColumn,
  mode = "admin",
  userId,
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
    channelName: mode === "employee-assigned" ? `leads:employee:${userId}` : "leads:admin",
    sortBy: mode === "employee-assigned" ? "assigned_at" : "created_at",
    sortDescending: true,
    includeRow,
  });

  return (
    <LeadsTable
      leads={leads}
      employees={employees}
      linkPrefix={linkPrefix}
      hideAssignedColumn={hideAssignedColumn}
    />
  );
}
