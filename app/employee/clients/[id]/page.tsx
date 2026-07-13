import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { assertClientAccess } from "@/lib/auth/client-access";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getNotifications } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { AppHeader } from "@/components/shared/app-header";
import { LiveClientOnboardingDetails } from "@/components/shared/live-client-onboarding-details";
import { WhatsAppChatPanel } from "@/components/shared/whatsapp-chat-panel";
import { Button } from "@/components/ui/button";

export default async function EmployeeClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await requireUserWithRole(["employee"]);
  const { id } = await params;
  const supabase = await createClient();
  const notifications = await getNotifications();

  const access = await assertClientAccess(supabase, id, current.id, current.role);
  if (!access.ok) notFound();

  const { data: client } = await supabase
    .from("client_onboardings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const typedClient = client as ClientOnboarding;

  let linkedLead: Pick<
    Lead,
    "id" | "source" | "assigned_to" | "client_name" | "client_phone"
  > | null = null;
  if (typedClient.lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("id, source, assigned_to, client_name, client_phone")
      .eq("id", typedClient.lead_id)
      .maybeSingle();
    linkedLead =
      (lead as Pick<
        Lead,
        "id" | "source" | "assigned_to" | "client_name" | "client_phone"
      > | null) ?? null;
  }

  const canChat =
    linkedLead?.source === "whatsapp" && linkedLead.assigned_to === current.id;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={typedClient.client_name}
        subtitle="Client onboarding record"
        userId={current.id}
        notifications={notifications}
        leadLinkPrefix="/employee/leads"
      />
      <main className="page-container-narrow space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/employee/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          {typedClient.lead_id && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/employee/leads/${typedClient.lead_id}`}>Open lead</Link>
            </Button>
          )}
        </div>
        <LiveClientOnboardingDetails clientId={typedClient.id} initialClient={typedClient} />
        {canChat && linkedLead && (
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
