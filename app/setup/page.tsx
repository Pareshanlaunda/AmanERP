import { redirect } from "next/navigation";
import { adminExists } from "@/lib/actions/users";
import { CreateUserForm } from "@/components/admin/create-user-form";

export default async function SetupPage() {
  const hasAdmin = await adminExists();

  if (hasAdmin) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md space-y-4">
        <div className="erp-panel overflow-hidden p-4 text-center sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/80">AMAN ERP</p>
          <h1 className="mt-2 text-2xl font-semibold">Setup</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first admin account to get started.
          </p>
        </div>
        <CreateUserForm mode="setup" />
      </div>
    </main>
  );
}
