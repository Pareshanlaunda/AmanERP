"use client";

import { useCallback, useMemo } from "react";
import type { EmployeeDetail } from "@/lib/actions/employees";
import type { Lead } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { useRealtimeRows } from "@/lib/hooks/use-realtime-rows";
import { LeadsTable } from "@/components/admin/leads-table";
import { LostLeadsTable } from "@/components/admin/lost-leads-table";
import { ClientsTable } from "@/components/dashboard/clients-table";

type RealtimeEmployeeDetailSectionsProps = {
  employeeId: string;
  initial: EmployeeDetail;
};

export function RealtimeEmployeeDetailSections({
  employeeId,
  initial,
}: RealtimeEmployeeDetailSectionsProps) {
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
    sortBy: "assigned_at",
    sortDescending: true,
    includeRow: includeLead,
  });

  const liveClients = useRealtimeRows({
    table: "client_onboardings",
    initialRows: initial.clients,
    channelName: `admin:employee-clients:${employeeId}`,
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

  return (
    <>
      <section className="erp-panel overflow-hidden">
        <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
          <h2 className="section-title">Summary</h2>
        </div>
        <div className="grid gap-4 p-4 text-sm sm:grid-cols-2 sm:p-6 lg:grid-cols-5">
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
      </section>

      <section className="erp-panel overflow-hidden">
        <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
          <h2 className="section-title">Active leads</h2>
          <p className="section-subtitle">Currently assigned or in progress.</p>
        </div>
        <div className="p-4 sm:p-6">
          <LeadsTable leads={activeLeads} employees={[]} hideAssignedColumn />
        </div>
      </section>

      <section className="erp-panel overflow-hidden">
        <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
          <h2 className="section-title">Onboarded clients</h2>
          <p className="section-subtitle">Clients with assigned CID numbers.</p>
        </div>
        <div className="p-4 sm:p-6">
          <ClientsTable
            clients={liveClients}
            showClientId
            showSearch
            viewLinkPrefix="/admin/clients"
          />
        </div>
      </section>

      <section className="erp-panel overflow-hidden">
        <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
          <h2 className="section-title">Lost / not converted</h2>
          <p className="section-subtitle">Closed without conversion, including rejection reasons.</p>
        </div>
        <div className="p-4 sm:p-6">
          <LostLeadsTable leads={lostLeads} />
        </div>
      </section>
    </>
  );
}
