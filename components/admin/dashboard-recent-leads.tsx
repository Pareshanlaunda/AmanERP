"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Lead, Profile } from "@/lib/types/database";
import { syncWhatsAppLeadsAction } from "@/lib/actions/whatsapp-sync";
import { CollapsiblePanel } from "@/components/shared/collapsible-panel";
import { RealtimeLeadsTable } from "@/components/admin/realtime-leads-table";
import { Button } from "@/components/ui/button";

type DashboardRecentLeadsProps = {
  initialLeads: Lead[];
  employees: Profile[];
};

export function DashboardRecentLeads({ initialLeads, employees }: DashboardRecentLeadsProps) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      const result = await syncWhatsAppLeadsAction();
      if (!result.success) {
        toast.error(result.error ?? "WhatsApp sync failed");
        return;
      }
      if (result.created === 0 && result.updated === 0) {
        toast.message("WhatsApp contacts already up to date");
        return;
      }
      toast.success(
        `Synced WhatsApp: ${result.created} new lead${result.created === 1 ? "" : "s"}` +
          (result.updated ? `, ${result.updated} updated` : "")
      );
    });
  }

  return (
    <CollapsiblePanel
      title="Recent leads"
      subtitle="WhatsApp contacts — first message or outbound sync"
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Search by client name, phone, or email...",
      }}
      headerActions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleSync}
        >
          {isPending ? "Syncing…" : "Sync WhatsApp"}
        </Button>
      }
    >
      <RealtimeLeadsTable initialLeads={initialLeads} employees={employees} searchQuery={query} />
    </CollapsiblePanel>
  );
}
