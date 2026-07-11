import { revalidatePath } from "next/cache";

export function revalidateLeadPages(leadId: string) {
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath(`/employee/leads/${leadId}`);
}

/** Realtime covers dashboard UI — only revalidate lead detail pages. */
export function revalidateLeadMutation(leadId: string) {
  revalidateLeadPages(leadId);
}

/** User/admin list pages still need SSR refresh after structural changes. */
export function revalidateAdminLists() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/users/new");
  revalidatePath("/admin/dashboard");
}

export function revalidateAfterUserCreated() {
  revalidateAdminLists();
}

export function revalidateAfterLeadCreated(options?: { assigned?: boolean }) {
  revalidatePath("/admin/dashboard");
  if (options?.assigned) {
    revalidatePath("/employee/dashboard");
  }
}

export function revalidateEmployeeDetail(employeeId: string) {
  revalidatePath(`/admin/employees/${employeeId}`);
}

export function revalidateClientPages(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath(`/employee/clients/${clientId}`);
}

export function revalidateClientMutation(
  clientId: string,
  options?: { previousOwnerId?: string | null; newOwnerId?: string | null; leadId?: string | null }
) {
  revalidateClientPages(clientId);
  revalidatePath("/employee/dashboard");
  revalidatePath("/admin/dashboard");
  if (options?.previousOwnerId) revalidateEmployeeDetail(options.previousOwnerId);
  if (options?.newOwnerId) revalidateEmployeeDetail(options.newOwnerId);
  if (options?.leadId) revalidateLeadPages(options.leadId);
}
