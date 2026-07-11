import type { EmployeeStats, Lead } from "@/lib/types/database";
import { EMPLOYEE_TYPE_LABELS } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

function matchesField(text: string | null | undefined, query: string) {
  if (!query) return true;
  if (!text) return false;
  return text.toLowerCase().includes(query);
}

export function filterLeads(leads: Lead[], query: string) {
  const q = normalizeQuery(query);
  if (!q) return leads;

  return leads.filter(
    (lead) =>
      matchesField(lead.client_name, q) ||
      matchesField(lead.client_phone, q) ||
      matchesField(lead.client_alternate_phone, q) ||
      matchesField(lead.client_email, q) ||
      matchesField(lead.notes, q)
  );
}

export function filterEmployees(employees: EmployeeStats[], query: string) {
  const q = normalizeQuery(query);
  if (!q) return employees;

  return employees.filter((employee) => {
    const typeLabel = EMPLOYEE_TYPE_LABELS[employee.employee_type ?? "general"];
    return (
      matchesField(employee.full_name, q) ||
      matchesField(employee.employee_code, q) ||
      matchesField(employee.email, q) ||
      matchesField(typeLabel, q)
    );
  });
}

export function filterClients(clients: ClientOnboarding[], query: string) {
  const q = normalizeQuery(query);
  if (!q) return clients;

  return clients.filter(
    (client) =>
      matchesField(client.client_name, q) ||
      matchesField(client.client_id, q) ||
      matchesField(client.client_email, q) ||
      matchesField(client.client_contact_number, q) ||
      matchesField(client.advocate_name, q)
  );
}

type UserSearchFields = {
  full_name?: string | null;
  email?: string | null;
  employee_code?: string | null;
  role?: string | null;
  employee_type?: string | null;
};

export function filterUsers<T extends UserSearchFields>(users: T[], query: string): T[] {
  const q = normalizeQuery(query);
  if (!q) return users;

  return users.filter((user) => {
    const typeLabel =
      user.role === "employee"
        ? EMPLOYEE_TYPE_LABELS[(user.employee_type as keyof typeof EMPLOYEE_TYPE_LABELS) ?? "general"]
        : "";
    return (
      matchesField(user.full_name, q) ||
      matchesField(user.email, q) ||
      matchesField(user.employee_code, q) ||
      matchesField(user.role, q) ||
      matchesField(typeLabel, q)
    );
  });
}
