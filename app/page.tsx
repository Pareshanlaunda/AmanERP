import { redirect } from "next/navigation";
import { adminExists } from "@/lib/actions/users";
import { dashboardPathForRole, getUserWithRole } from "@/lib/auth/get-user";

export default async function HomePage() {
  const current = await getUserWithRole();

  if (current) {
    redirect(dashboardPathForRole(current.role));
  }

  const hasAdmin = await adminExists();
  redirect(hasAdmin ? "/login" : "/setup");
}
