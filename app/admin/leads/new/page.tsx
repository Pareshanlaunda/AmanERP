import { redirect } from "next/navigation";
import { requireUserWithRole } from "@/lib/auth/get-user";

/** Manual create disabled — leads come from WhatsApp webhook only. */
export default async function NewLeadPage() {
  await requireUserWithRole(["admin"]);
  redirect("/admin/dashboard");
}
