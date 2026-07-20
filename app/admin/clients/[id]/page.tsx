import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getEmployeeProfilesForAdmin } from "@/lib/actions/employees";
import { getNotifications } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { AppHeader } from "@/components/shared/app-header";
import { AssignClientForm } from "@/components/admin/assign-client-form";
import { ClientNoticePanel } from "@/components/shared/client-notice-panel";
import { LiveClientOnboardingDetails } from "@/components/shared/live-client-onboarding-details";
import { WhatsAppChatPanel } from "@/components/shared/whatsapp-chat-panel";
import { Button } from "@/components/ui/button";
import { listAdditionalAssigneeIds } from "@/lib/leads/assignees";
import { getLatestNoticeIdsForClients } from "@/lib/actions/notices";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await requireUserWithRole(["admin"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("client_onboardings")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const typedClient = client as ClientOnboarding;
  const backHref = typedClient.lead_id
    ? `/admin/leads/${typedClient.lead_id}`
    : "/admin/dashboard";

  const [notifications, employees, linkedLeadResult, additionalIds, noticeMap] =
    await Promise.all([
      getNotifications(),
      getEmployeeProfilesForAdmin(),
      typedClient.lead_id
        ? supabase
            .from("leads")
            .select("id, source, client_name, client_phone")
            .eq("id", typedClient.lead_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      typedClient.lead_id
        ? listAdditionalAssigneeIds(supabase, typedClient.lead_id)
        : Promise.resolve([] as string[]),
      getLatestNoticeIdsForClients([typedClient.id]),
    ]);

  const linkedLead =
    (linkedLeadResult.data as Pick<
      Lead,
      "id" | "source" | "client_name" | "client_phone"
    > | null) ?? null;

  const owner = employees.find((e) => e.id === typedClient.submitted_by);
  const ownerName = owner?.full_name ?? owner?.email ?? "Employee";
  const additionalNames = additionalIds
    .filter((id) => id !== typedClient.submitted_by)
    .map((id) => {
      const emp = employees.find((e) => e.id === id);
      return emp?.full_name ?? emp?.email ?? "Employee";
    });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={typedClient.client_name}
        subtitle="Client onboarding record"
        userId={current.id}
        notifications={notifications}
        leadLinkPrefix="/admin/leads"
      />
      <main className="page-container-narrow space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            {typedClient.lead_id ? "Back to lead" : "Back to dashboard"}
          </Link>
        </Button>

        <section className="erp-panel overflow-hidden">
          <div className="space-y-1 border-b border-border/70 bg-accent/30 px-4 py-3 sm:px-6">
            <p className="text-sm">
              <span className="font-medium">Primary owner:</span> {ownerName}
            </p>
            {additionalNames.length > 0 && (
              <p className="text-sm">
                <span className="font-medium">Additional:</span> {additionalNames.join(", ")}
              </p>
            )}
          </div>
        </section>

        <AssignClientForm
          clientId={typedClient.id}
          employees={employees}
          currentOwnerId={typedClient.submitted_by}
          currentAdditionalIds={additionalIds}
          hasLinkedLead={Boolean(typedClient.lead_id)}
        />

        <ClientNoticePanel
          client={typedClient}
          latestNoticeId={noticeMap[typedClient.id] ?? null}
        />

        <LiveClientOnboardingDetails clientId={typedClient.id} initialClient={typedClient} />
        {linkedLead?.source === "whatsapp" && (
          <WhatsAppChatPanel
            leadId={linkedLead.id}
            clientName={typedClient.client_name ?? linkedLead.client_name}
            clientPhone={
              typedClient.client_contact_number ?? linkedLead.client_phone
            }
            enabled
          />
        )}
      </main>
    </div>
  );
}
