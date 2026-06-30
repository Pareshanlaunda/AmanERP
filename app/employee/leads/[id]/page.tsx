import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getLeadComments, hasUnreadComments } from "@/lib/actions/comments";
import { createClient } from "@/lib/supabase/server";
import type { Lead, LeadUpdate } from "@/lib/types/database";
import { getNotifications } from "@/lib/actions/notifications";
import { AppHeader } from "@/components/shared/app-header";
import { LeadDetailPanel } from "@/components/employee/lead-detail-panel";
import { Button } from "@/components/ui/button";

async function getAuthorNames(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("profiles").select("id, full_name");
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name ?? "User"]));
}

export default async function EmployeeLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await requireUserWithRole(["employee"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("assigned_to", current.id)
    .single();

  if (!lead) notFound();

  const { data: updates } = await supabase
    .from("lead_updates")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const comments = await getLeadComments(id);
  const unread = await hasUnreadComments(id);
  const authorNames = await getAuthorNames(supabase);
  const notifications = await getNotifications();

  let clientId: string | null = null;
  if (lead.onboarding_record_id) {
    const { data: onboarding } = await supabase
      .from("client_onboardings")
      .select("client_id")
      .eq("id", lead.onboarding_record_id)
      .single();
    clientId = onboarding?.client_id ?? null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={(lead as Lead).client_name}
        subtitle="Lead progress and onboarding"
        notifications={notifications}
        leadLinkPrefix="/employee/leads"
      />
      <main className="page-container-narrow">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4 sm:mb-6">
          <Link href="/employee/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
        <LeadDetailPanel
          lead={lead as Lead}
          updates={(updates ?? []) as LeadUpdate[]}
          comments={comments}
          hasUnreadComments={unread}
          authorNames={authorNames}
          clientId={clientId}
        />
      </main>
    </div>
  );
}
