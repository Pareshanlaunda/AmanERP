import { redirect } from "next/navigation";
import { getUserWithRole, dashboardPathForRole } from "@/lib/auth/get-user";

export default async function HomePage() {
  const current = await getUserWithRole();

  if (current) {
    redirect(dashboardPathForRole(current.role));
  }

  // Admin already exists — always send unauthenticated users to login.
  // The /setup route has its own guard if someone needs first-time setup.
  redirect("/login");
}
