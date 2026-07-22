"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lead } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { filterClients, filterLeads } from "@/lib/filters/list-search";
import { isActiveEmployeeLead } from "@/lib/filters/employee-leads";
import { AssignedLeadsTable } from "@/components/employee/assigned-leads-table";
import { MyClientsTable } from "@/components/employee/my-clients-table";
import { useRealtimeRows } from "@/lib/hooks/use-realtime-rows";
import { CollapsiblePanel } from "@/components/shared/collapsible-panel";
import { SearchBar } from "@/components/dashboard/search-bar";

const EMPTY_NOTICE_IDS: Record<string, string> = Object.freeze({});

type EmployeeDashboardContentProps = {
  userId: string;
  leads: Lead[];
  clients: ClientOnboarding[];
  latestNoticeIds?: Record<string, string>;
};

export function EmployeeDashboardContent({
  userId,
  leads,
  clients,
  latestNoticeIds,
}: EmployeeDashboardContentProps) {
  const noticeSource = latestNoticeIds ?? EMPTY_NOTICE_IDS;
  const [leadQuery, setLeadQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [noticeIds, setNoticeIds] = useState(noticeSource);
  const [hiddenClientIds, setHiddenClientIds] = useState(() => new Set<string>());

  useEffect(() => {
    setNoticeIds(noticeSource);
  }, [noticeSource]);

  const includeRow = useCallback(
    (lead: Lead) => isActiveEmployeeLead(lead, userId),
    [userId]
  );

  const liveLeads = useRealtimeRows({
    table: "leads",
    initialRows: leads,
    channelName: `leads:employee-dashboard:${userId}`,
    // No assigned_to filter: additional assignees must receive updates; RLS gates payloads.
    sortBy: "assigned_at",
    sortDescending: true,
    includeRow,
  });

  // Derive from live leads so realtime co-assign shows linked clients.
  const assignedLeadIds = useMemo(
    () => new Set(liveLeads.map((lead) => lead.id)),
    [liveLeads]
  );

  const filteredLeads = useMemo(
    () => filterLeads(liveLeads, leadQuery),
    [liveLeads, leadQuery]
  );

  const includeClient = useCallback(
    (client: ClientOnboarding) =>
      !client.archived_at &&
      !hiddenClientIds.has(client.id) &&
      (client.submitted_by === userId ||
        (Boolean(client.lead_id) && assignedLeadIds.has(client.lead_id as string))),
    [userId, assignedLeadIds, hiddenClientIds]
  );

  const liveClients = useRealtimeRows({
    table: "client_onboardings",
    initialRows: clients,
    channelName: `clients:employee:${userId}`,
    // No single-column filter: assignees need lead-linked clients; RLS gates payloads.
    sortBy: "created_at",
    sortDescending: true,
    includeRow: includeClient,
  });

  const filteredClients = useMemo(
    () =>
      filterClients(liveClients, clientQuery).filter(
        (client) => !hiddenClientIds.has(client.id) && !client.archived_at
      ),
    [liveClients, clientQuery, hiddenClientIds]
  );

  const visibleClientCount = useMemo(
    () =>
      liveClients.filter(
        (client) => !hiddenClientIds.has(client.id) && !client.archived_at
      ).length,
    [liveClients, hiddenClientIds]
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

      {/* Flat section — no outer erp-panel card, no nested scroll */}
      <section className="space-y-4">
        <div>
          <h2 className="section-title">My clients</h2>
          <p className="section-subtitle">
            {filteredClients.length} of {visibleClientCount} clients (yours + assigned leads)
          </p>
        </div>
        <SearchBar
          value={clientQuery}
          onChange={setClientQuery}
          placeholder="Search by client name, CLID, phone, or email..."
          className="max-w-none"
        />
        <MyClientsTable
          clients={filteredClients}
          latestNoticeIds={noticeIds}
          onNoticeSaved={(clientId, noticeId) =>
            setNoticeIds((prev) => ({ ...prev, [clientId]: noticeId }))
          }
          onClientRemoved={(clientId) =>
            setHiddenClientIds((prev) => new Set(prev).add(clientId))
          }
          emptyMessage={
            visibleClientCount > 0 && filteredClients.length === 0
              ? "No clients match your search."
              : undefined
          }
        />
      </section>
    </div>
  );
}
