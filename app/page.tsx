import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/auth/login-screen";
import { getUserWithRole, dashboardPathForRole } from "@/lib/auth/get-user";

export default async function HomePage() {
  const current = await getUserWithRole();

  if (current) {
    redirect(dashboardPathForRole(current.role));
  }

  return <LoginScreen />;
}
