"use client";

import { useCallback, useMemo, useState } from "react";
import type { Lead } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { filterClients, filterLeads } from "@/lib/filters/list-search";
import { isActiveEmployeeLead } from "@/lib/filters/employee-leads";
import { AssignedLeadsTable } from "@/components/employee/assigned-leads-table";
import { useRealtimeRows } from "@/lib/hooks/use-realtime-rows";
import { ClientsTable } from "@/components/dashboard/clients-table";
import { CollapsiblePanel } from "@/components/shared/collapsible-panel";

type EmployeeDashboardContentProps = {
  userId: string;
  leads: Lead[];
  clients: ClientOnboarding[];
};

export function EmployeeDashboardContent({ userId, leads, clients }: EmployeeDashboardContentProps) {
  const [leadQuery, setLeadQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");

  const includeRow = useCallback(
    (lead: Lead) => isActiveEmployeeLead(lead, userId),
    [userId]
  );

  const liveLeads = useRealtimeRows({
    table: "leads",
    initialRows: leads,
    channelName: `leads:employee-dashboard:${userId}`,
    sortBy: "assigned_at",
    sortDescending: true,
    includeRow,
  });

  const filteredLeads = useMemo(
    () => filterLeads(liveLeads, leadQuery),
    [liveLeads, leadQuery]
  );

  const includeClient = useCallback(
    (client: ClientOnboarding) => client.submitted_by === userId,
    [userId]
  );

  const liveClients = useRealtimeRows({
    table: "client_onboardings",
    initialRows: clients,
    channelName: `clients:employee:${userId}`,
    filter: `submitted_by=eq.${userId}`,
    sortBy: "created_at",
    sortDescending: true,
    includeRow: includeClient,
  });

  const filteredClients = useMemo(
    () => filterClients(liveClients, clientQuery),
    [liveClients, clientQuery]
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <CollapsiblePanel
        title="My assigned leads"
        subtitle={`${filteredLeads.length} of ${liveLeads.length} active assignments`}
        search={{
          value: leadQuery,
          onChange: setLeadQuery,
          placeholder: "Search leads by client name, phone, or email...",
        }}
      >
        <AssignedLeadsTable
          leads={filteredLeads}
          emptyMessage={
            liveLeads.length > 0 && filteredLeads.length === 0
              ? "No leads match your search."
              : undefined
          }
        />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="My clients"
        subtitle={`${filteredClients.length} of ${liveClients.length} onboarded clients`}
        search={{
          value: clientQuery,
          onChange: setClientQuery,
          placeholder: "Search by client name, CLID, phone, or email...",
        }}
      >
        <ClientsTable
          clients={filteredClients}
          showClientId
          emptyMessage={
            liveClients.length > 0 && filteredClients.length === 0
              ? "No clients match your search."
              : undefined
          }
        />
      </CollapsiblePanel>
    </div>
  );
}
