import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireUserWithRole } from "@/lib/auth/get-user";

import { listUsers } from "@/lib/actions/users";

import { getNotifications } from "@/lib/actions/notifications";

import { AppHeader } from "@/components/shared/app-header";

import { CreateUserForm } from "@/components/admin/create-user-form";

import { RealtimeUsersTable } from "@/components/admin/realtime-users-table";

import { Button } from "@/components/ui/button";



export default async function AdminUsersPage() {

  const current = await requireUserWithRole(["admin"]);

  const users = await listUsers();

  const notifications = await getNotifications();



  return (

    <div className="min-h-screen bg-background">

      <AppHeader

        title="Manage users"

        subtitle={current.email}
        userId={current.id}
        notifications={notifications}

        leadLinkPrefix="/admin/leads"

      />

      <main className="page-container-narrow space-y-6 sm:space-y-8">

        <Button variant="ghost" size="sm" asChild className="-ml-2">

          <Link href="/admin/dashboard">

            <ArrowLeft className="h-4 w-4" />

            Back to dashboard

          </Link>

        </Button>



        <CreateUserForm mode="admin" />



        <section className="erp-panel overflow-hidden">

          <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">

            <h2 className="section-title">All users</h2>

            <p className="section-subtitle">{users.length} accounts</p>

          </div>

          <div className="p-4 sm:p-6">

            <RealtimeUsersTable initialUsers={users} />

          </div>

        </section>

      </main>

    </div>

  );

}

