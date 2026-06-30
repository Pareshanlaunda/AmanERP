import { redirect } from "next/navigation";
import { dashboardPathForRole, getUserWithRole } from "@/lib/auth/get-user";

export default async function DashboardRedirectPage() {
  const current = await getUserWithRole();

  if (!current) {
    redirect("/login");
  }

  redirect(dashboardPathForRole(current.role));
}
