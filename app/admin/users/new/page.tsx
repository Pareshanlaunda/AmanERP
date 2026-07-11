import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getNotifications } from "@/lib/actions/notifications";
import { AppHeader } from "@/components/shared/app-header";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { Button } from "@/components/ui/button";

export default async function AdminCreateUserPage() {
  const current = await requireUserWithRole(["admin"]);
  const notifications = await getNotifications();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Add user"
        subtitle={current.email}
        userId={current.id}
        notifications={notifications}
        leadLinkPrefix="/admin/leads"
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/users">
              <Users className="h-4 w-4" />
              Manage users
            </Link>
          </Button>
        }
      />

      <main className="page-container-narrow space-y-6 sm:space-y-8">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>

        <CreateUserForm mode="admin" />
      </main>
    </div>
  );
}
