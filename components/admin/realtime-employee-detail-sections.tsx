"use client";

import { useCallback, useMemo, useState } from "react";
import type { EmployeeDetail } from "@/lib/actions/employees";
import type { Lead } from "@/lib/types/database";
import { EMPLOYEE_TYPE_LABELS } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { filterClients, filterLeads } from "@/lib/filters/list-search";
import { useRealtimeRows } from "@/lib/hooks/use-realtime-rows";
import { LeadsTable } from "@/components/admin/leads-table";
import { LostLeadsTable } from "@/components/admin/lost-leads-table";
import { ClientsTable } from "@/components/dashboard/clients-table";
import { CollapsiblePanel } from "@/components/shared/collapsible-panel";

type RealtimeEmployeeDetailSectionsProps = {
  employeeId: string;
  initial: EmployeeDetail;
};

export function RealtimeEmployeeDetailSections({
  employeeId,
  initial,
}: RealtimeEmployeeDetailSectionsProps) {
  const [activeQuery, setActiveQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [lostQuery, setLostQuery] = useState("");

  const includeLead = useCallback(
    (lead: Lead) => lead.assigned_to === employeeId,
    [employeeId]
  );

  const includeClient = useCallback(
    (client: ClientOnboarding) => client.submitted_by === employeeId,
    [employeeId]
  );

  const liveLeads = useRealtimeRows({
    table: "leads",
    initialRows: initial.leads,
    channelName: `admin:employee-leads:${employeeId}`,
    filter: `assigned_to=eq.${employeeId}`,
    sortBy: "assigned_at",
    sortDescending: true,
    includeRow: includeLead,
  });

  const liveClients = useRealtimeRows({
    table: "client_onboardings",
    initialRows: initial.clients,
    channelName: `admin:employee-clients:${employeeId}`,
    filter: `submitted_by=eq.${employeeId}`,
    sortBy: "created_at",
    sortDescending: true,
    includeRow: includeClient,
  });

  const activeLeads = useMemo(
    () => liveLeads.filter((lead) => lead.status !== "lost"),
    [liveLeads]
  );
  const lostLeads = useMemo(
    () => liveLeads.filter((lead) => lead.status === "lost"),
    [liveLeads]
  );
  const convertedCount = useMemo(
    () => liveLeads.filter((lead) => lead.status === "converted").length,
    [liveLeads]
  );

  const filteredActiveLeads = useMemo(
    () => filterLeads(activeLeads, activeQuery),
    [activeLeads, activeQuery]
  );
  const filteredClients = useMemo(
    () => filterClients(liveClients, clientQuery),
    [liveClients, clientQuery]
  );
  const filteredLostLeads = useMemo(
    () => filterLeads(lostLeads, lostQuery),
    [lostLeads, lostQuery]
  );

  return (
    <>
      <section className="erp-panel overflow-hidden">
        <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
          <h2 className="section-title">Summary</h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="md:hidden">
            <p className="text-sm text-muted-foreground">Employee type</p>
            <p className="font-medium">
              {EMPLOYEE_TYPE_LABELS[initial.employee_type ?? "general"]}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">Email</p>
            <p className="break-all font-medium">{initial.email ?? "—"}</p>
            <div className="mobile-stat-grid mt-4">
              <div className="mobile-stat-item">
                <div className="mobile-stat-label">Active leads</div>
                <div className="mobile-stat-value">{activeLeads.length}</div>
              </div>
              <div className="mobile-stat-item">
                <div className="mobile-stat-label">Lost</div>
                <div className="mobile-stat-value">{lostLeads.length}</div>
              </div>
              <div className="mobile-stat-item">
                <div className="mobile-stat-label">Clients</div>
                <div className="mobile-stat-value">{liveClients.length}</div>
              </div>
              <div className="mobile-stat-item">
                <div className="mobile-stat-label">Converted</div>
                <div className="mobile-stat-value">{convertedCount}</div>
              </div>
            </div>
          </div>

          <div className="hidden gap-4 text-sm md:grid md:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="text-muted-foreground">Employee type</div>
              <div className="font-medium">
                {EMPLOYEE_TYPE_LABELS[initial.employee_type ?? "general"]}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Email</div>
              <div className="font-medium">{initial.email ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Active leads</div>
              <div className="font-medium">
                <span className="stat-pill">{activeLeads.length}</span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Lost / not converted</div>
              <div className="font-medium">
                <span className="stat-pill">{lostLeads.length}</span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Onboarded clients</div>
              <div className="font-medium">
                <span className="stat-pill">{liveClients.length}</span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Converted</div>
              <div className="font-medium">
                <span className="stat-pill">{convertedCount}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CollapsiblePanel
        title="Active leads"
        subtitle={`${filteredActiveLeads.length} of ${activeLeads.length} currently assigned or in progress`}
        search={{
          value: activeQuery,
          onChange: setActiveQuery,
          placeholder: "Search active leads by client, phone, or email...",
        }}
      >
        <LeadsTable
          leads={filteredActiveLeads}
          employees={[]}
          hideAssignedColumn
          emptyMessage={
            activeLeads.length > 0 && filteredActiveLeads.length === 0
              ? "No active leads match your search."
              : undefined
          }
        />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Onboarded clients"
        subtitle={`${filteredClients.length} of ${liveClients.length} clients with assigned CLIDs`}
        search={{
          value: clientQuery,
          onChange: setClientQuery,
          placeholder: "Search by client name, CLID, phone, or email...",
        }}
      >
        <ClientsTable
          clients={filteredClients}
          showClientId
          viewLinkPrefix="/admin/clients"
          emptyMessage={
            liveClients.length > 0 && filteredClients.length === 0
              ? "No clients match your search."
              : undefined
          }
        />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Lost / not converted"
        subtitle={`${filteredLostLeads.length} of ${lostLeads.length} closed without conversion`}
        search={{
          value: lostQuery,
          onChange: setLostQuery,
          placeholder: "Search lost leads by client, phone, or email...",
        }}
      >
        <LostLeadsTable
          leads={filteredLostLeads}
          emptyMessage={
            lostLeads.length > 0 && filteredLostLeads.length === 0
              ? "No lost leads match your search."
              : undefined
          }
        />
      </CollapsiblePanel>
    </>
  );
}
