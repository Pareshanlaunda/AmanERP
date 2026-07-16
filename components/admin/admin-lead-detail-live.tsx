"use client";

import type { Lead, LeadUpdate, Profile } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import type { LeadComment } from "@/lib/types/database";
import { LiveAssignLeadSection } from "@/components/admin/live-assign-lead-section";
import { LiveLeadOnboardingSection } from "@/components/shared/live-lead-onboarding-section";
import { LeadCommentsPanel } from "@/components/shared/lead-comments-panel";
import { LeadInfoFields } from "@/components/shared/lead-info-fields";
import { LiveLeadStatus } from "@/components/shared/live-lead-status";
import { LeadTimelinePanel } from "@/components/shared/lead-timeline-panel";
import { LeadLiveProvider, useLeadLive } from "@/components/shared/lead-live-provider";
import { WhatsAppChatPanel } from "@/components/shared/whatsapp-chat-panel";
import { PageTabs } from "@/components/shared/page-tabs";

type AdminLeadDetailLiveProps = {
  lead: Lead;
  employees: Profile[];
  currentUserId: string;
  comments: LeadComment[];
  hasUnread: boolean;
  authorNames: Record<string, string>;
  onboarding: ClientOnboarding | null;
  updates: LeadUpdate[];
};

function AdminLeadInfoSection({ employees }: { employees: Profile[] }) {
  const { lead } = useLeadLive();
  const employeeNames = Object.fromEntries(
    employees.map((e) => [e.id, e.full_name ?? "Employee"])
  );

  return (
    <section className="erp-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border/70 bg-accent/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h2 className="section-title">Lead info</h2>
        <LiveLeadStatus variant="badge" />
      </div>
      <div className="space-y-2 p-4 text-sm sm:p-6">
        <LeadInfoFields lead={lead} employeeNames={employeeNames} />
        <LiveLeadStatus variant="alerts" />
      </div>
    </section>
  );
}

function AdminWhatsAppSection({ leadId }: { leadId: string }) {
  const { lead } = useLeadLive();
  return (
    <WhatsAppChatPanel
      leadId={leadId}
      clientName={lead.client_name}
      clientPhone={lead.client_phone}
      enabled={lead.source === "whatsapp"}
    />
  );
}

function AdminLeadTabbedContent(props: AdminLeadDetailLiveProps) {
  const { lead, employees, currentUserId, comments, hasUnread, authorNames, onboarding, updates } =
    props;
  const showWhatsApp = lead.source === "whatsapp";

  return (
    <PageTabs
      tabs={[
        { id: "details", label: "Details", number: 1 },
        { id: "comments", label: "Comments", number: 2 },
        { id: "whatsapp", label: "WhatsApp", number: 3, hidden: !showWhatsApp },
        { id: "assign", label: "Assignment", number: showWhatsApp ? 4 : 3 },
        { id: "activity", label: "Activity", number: showWhatsApp ? 5 : 4 },
      ]}
    >
      {(activeTabId) => (
        <div className="space-y-6">
          {activeTabId === "details" && (
            <>
              <AdminLeadInfoSection employees={employees} />
              <LiveLeadOnboardingSection initialOnboarding={onboarding} />
            </>
          )}

          {activeTabId === "comments" && (
            <LeadCommentsPanel
              leadId={lead.id}
              currentUserId={currentUserId}
              comments={comments}
              hasUnread={hasUnread}
              authorNames={authorNames}
            />
          )}

          {activeTabId === "whatsapp" && showWhatsApp && <AdminWhatsAppSection leadId={lead.id} />}

          {activeTabId === "assign" && <LiveAssignLeadSection employees={employees} />}

          {activeTabId === "activity" && (
            <LeadTimelinePanel leadId={lead.id} initialUpdates={updates} />
          )}
        </div>
      )}
    </PageTabs>
  );
}

export function AdminLeadDetailLive(props: AdminLeadDetailLiveProps) {
  return (
    <LeadLiveProvider initialLead={props.lead}>
      <AdminLeadTabbedContent {...props} />
    </LeadLiveProvider>
  );
}
