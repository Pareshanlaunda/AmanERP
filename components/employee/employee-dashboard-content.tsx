"use client";

import { useCallback, useMemo, useState } from "react";
import type { Lead } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { SearchBar } from "@/components/dashboard/search-bar";
import { AssignedLeadsTable } from "@/components/employee/assigned-leads-table";
import { useRealtimeRows } from "@/lib/hooks/use-realtime-rows";
import { ClientsTable } from "@/components/dashboard/clients-table";

type EmployeeDashboardContentProps = {
  userId: string;
  leads: Lead[];
  clients: ClientOnboarding[];
};

function matchesQuery(text: string | null | undefined, query: string) {
  if (!text) return false;
  return text.toLowerCase().includes(query);
}

export function EmployeeDashboardContent({ userId, leads, clients }: EmployeeDashboardContentProps) {
  const [query, setQuery] = useState("");

  const includeRow = useCallback(
    (lead: Lead) =>
      lead.assigned_to === userId &&
      lead.status !== "converted" &&
      lead.status !== "lost",
    [userId]
  );

  const liveLeads = useRealtimeRows({
    table: "leads",
    initialRows: leads,
    channelName: `leads:employee:${userId}`,
    sortBy: "assigned_at",
    sortDescending: true,
    includeRow,
  });

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return liveLeads;
    return liveLeads.filter(
      (lead) =>
        matchesQuery(lead.client_name, q) ||
        matchesQuery(lead.client_phone, q) ||
        matchesQuery(lead.client_email, q)
    );
  }, [liveLeads, query]);

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

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return liveClients;
    return liveClients.filter(
      (client) =>
        matchesQuery(client.client_name, q) ||
        matchesQuery(client.client_id, q) ||
        matchesQuery(client.client_email, q) ||
        matchesQuery(client.client_contact_number, q)
    );
  }, [liveClients, query]);

  return (
    <div className="space-y-8">
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search by client name, CID, phone, or email..."
        className="max-w-none"
      />

      <section className="erp-panel overflow-hidden">
        <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
          <h2 className="section-title">My assigned leads</h2>
          <p className="section-subtitle">{filteredLeads.length} active assignments</p>
        </div>
        <div className="p-4 sm:p-6">
          <AssignedLeadsTable leads={filteredLeads} />
        </div>
      </section>

      <section className="erp-panel overflow-hidden">
        <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
          <h2 className="section-title">My clients</h2>
          <p className="section-subtitle">{filteredClients.length} onboarded clients</p>
        </div>
        <div className="p-4 sm:p-6">
          <ClientsTable clients={filteredClients} showClientId />
        </div>
      </section>
    </div>
  );
}
