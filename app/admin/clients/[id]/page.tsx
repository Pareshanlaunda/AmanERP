import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getNotifications } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { AppHeader } from "@/components/shared/app-header";
import { LiveClientOnboardingDetails } from "@/components/shared/live-client-onboarding-details";
import { WhatsAppChatPanel } from "@/components/shared/whatsapp-chat-panel";
import { Button } from "@/components/ui/button";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await requireUserWithRole(["admin"]);
  const { id } = await params;
  const supabase = await createClient();
  const notifications = await getNotifications();

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

  let linkedLead: Pick<Lead, "id" | "source" | "client_name" | "client_phone"> | null = null;
  if (typedClient.lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("id, source, client_name, client_phone")
      .eq("id", typedClient.lead_id)
      .maybeSingle();
    linkedLead =
      (lead as Pick<Lead, "id" | "source" | "client_name" | "client_phone"> | null) ?? null;
  }

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
