"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { Lead, Profile } from "@/lib/types/database";
import { CollapsiblePanel } from "@/components/shared/collapsible-panel";
import { RealtimeLeadsTable } from "@/components/admin/realtime-leads-table";
import { HeaderLink } from "@/components/shared/app-header";

type DashboardRecentLeadsProps = {
  initialLeads: Lead[];
  employees: Profile[];
};

export function DashboardRecentLeads({ initialLeads, employees }: DashboardRecentLeadsProps) {
  const [query, setQuery] = useState("");

  return (
    <CollapsiblePanel
      title="Recent leads"
      subtitle="Latest leads across the team"
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Search by client name, phone, or email...",
      }}
      headerActions={
        <HeaderLink href="/admin/leads/new">
          <Plus className="h-4 w-4" />
          New lead
        </HeaderLink>
      }
    >
      <RealtimeLeadsTable initialLeads={initialLeads} employees={employees} searchQuery={query} />
    </CollapsiblePanel>
  );
}
