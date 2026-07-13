import { redirect } from "next/navigation";
import { getUserWithRole, dashboardPathForRole } from "@/lib/auth/get-user";

export default async function HomePage() {
  const current = await getUserWithRole();

  if (current) {
    redirect(dashboardPathForRole(current.role));
  }

  // Unauthenticated users always go to login (bootstrap /setup removed).
  redirect("/login");
}
