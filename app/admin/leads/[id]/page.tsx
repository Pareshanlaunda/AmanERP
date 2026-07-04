import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getEmployeeProfilesForAdmin } from "@/lib/actions/employees";
import { getLeadComments, hasUnreadComments } from "@/lib/actions/comments";
import { getNotifications } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Lead, LeadUpdate } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { AppHeader } from "@/components/shared/app-header";
import { AdminLeadDetailLive } from "@/components/admin/admin-lead-detail-live";
import { Button } from "@/components/ui/button";
import { getAuthorNamesFromComments } from "@/lib/queries/profiles";

async function getLeadOnboarding(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lead: Lead
): Promise<ClientOnboarding | null> {
  const onboardingId = lead.onboarding_record_id ?? lead.converted_onboarding_id;
  if (!onboardingId) return null;

  const { data } = await supabase
    .from("client_onboardings")
    .select("*")
    .eq("id", onboardingId)
    .single();

  return (data as ClientOnboarding) ?? null;
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await requireUserWithRole(["admin"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single();
  if (!lead) notFound();

  const typedLead = lead as Lead;

  const [{ data: updates }, employees, notifications, comments, unread, authorNames, onboarding] =
    await Promise.all([
      supabase
        .from("lead_updates")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      getEmployeeProfilesForAdmin(),
      getNotifications(),
      getLeadComments(id),
      hasUnreadComments(id),
      getAuthorNamesFromComments(id, supabase),
      getLeadOnboarding(supabase, typedLead),
    ]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={typedLead.client_name}
        subtitle="Lead details and assignment"
        userId={current.id}
        notifications={notifications}
        leadLinkPrefix="/admin/leads"
      />
      <main className="page-container-narrow space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>

        <AdminLeadDetailLive
          lead={typedLead}
          employees={employees}
          currentUserId={current.id}
          comments={comments}
          hasUnread={unread}
          authorNames={authorNames}
          onboarding={onboarding}
          updates={(updates ?? []) as LeadUpdate[]}
        />
      </main>
    </div>
  );
}
