"use client";

import { useCallback, useMemo, useState } from "react";
import { getEmployeeDetail, type EmployeeDetail } from "@/lib/actions/employees";
import { EMPLOYEE_TYPE_LABELS } from "@/lib/types/database";
import { filterClients, filterLeads } from "@/lib/filters/list-search";
import { useRealtimeInvalidation } from "@/lib/hooks/use-realtime-record";
import { LeadsTable } from "@/components/admin/leads-table";
import { LostLeadsTable } from "@/components/admin/lost-leads-table";
import { ClientsTable } from "@/components/dashboard/clients-table";
import { CollapsiblePanel } from "@/components/shared/collapsible-panel";
import { EmployeeRemovalPanel } from "@/components/admin/employee-removal-panel";
import type { Profile } from "@/lib/types/database";

type RealtimeEmployeeDetailSectionsProps = {
  employeeId: string;
  initial: EmployeeDetail;
  employees: (Profile & { email?: string })[];
};

export function RealtimeEmployeeDetailSections({
  employeeId,
  initial,
  employees,
}: RealtimeEmployeeDetailSectionsProps) {
  const [detail, setDetail] = useState(initial);
  const [activeQuery, setActiveQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [lostQuery, setLostQuery] = useState("");

  const refresh = useCallback(() => {
    void getEmployeeDetail(employeeId)
      .then(setDetail)
      .catch((err) => {
        console.error("[employee-detail] refresh failed", err);
      });
  }, [employeeId]);

  // Full refetch keeps primary + co-assignee leads in sync (filter-only realtime dropped extras).
  useRealtimeInvalidation(
    `admin:employee-detail:${employeeId}`,
    ["leads", "client_onboardings", "lead_additional_assignees"],
    refresh
  );

  const activeLeads = useMemo(
    () => detail.leads.filter((lead) => lead.status !== "lost"),
    [detail.leads]
  );
  const lostLeads = useMemo(
    () => detail.leads.filter((lead) => lead.status === "lost"),
    [detail.leads]
  );
  const convertedCount = useMemo(
    () => detail.leads.filter((lead) => lead.status === "converted").length,
    [detail.leads]
  );

  const filteredActiveLeads = useMemo(
    () => filterLeads(activeLeads, activeQuery),
    [activeLeads, activeQuery]
  );
  const filteredClients = useMemo(
    () => filterClients(detail.clients, clientQuery),
    [detail.clients, clientQuery]
  );
  const filteredLostLeads = useMemo(
    () => filterLeads(lostLeads, lostQuery),
    [lostLeads, lostQuery]
  );

  return (
    <>
      <EmployeeRemovalPanel
        employeeId={employeeId}
        employeeName={detail.full_name ?? "Employee"}
        isActive={detail.is_active !== false}
        deactivatedAt={detail.deactivated_at}
        leads={detail.leads}
        clients={detail.clients}
        employees={employees}
        onReassigned={refresh}
      />

      <section className="erp-panel overflow-hidden">
        <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
          <h2 className="section-title">Summary</h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="md:hidden">
            <p className="text-sm text-muted-foreground">Employee type</p>
            <p className="font-medium">
              {EMPLOYEE_TYPE_LABELS[detail.employee_type ?? "general"]}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">Email</p>
            <p className="break-all font-medium">{detail.email ?? "—"}</p>
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
                <div className="mobile-stat-value">{detail.clients.length}</div>
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
                {EMPLOYEE_TYPE_LABELS[detail.employee_type ?? "general"]}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Email</div>
              <div className="font-medium">{detail.email ?? "—"}</div>
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
                <span className="stat-pill">{detail.clients.length}</span>
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
        subtitle={`${filteredClients.length} of ${detail.clients.length} clients with assigned CLIDs`}
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
            detail.clients.length > 0 && filteredClients.length === 0
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
