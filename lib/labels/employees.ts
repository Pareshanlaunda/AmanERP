import type { EmployeeType, Profile } from "@/lib/types/database";

export const EMPLOYEE_TYPE_OPTIONS = [
  { value: "advocate", label: "Advocate" },
  { value: "csa", label: "CSA" },
  { value: "hr", label: "HR" },
  { value: "director", label: "Director" },
  { value: "finance", label: "Finance" },
  { value: "general", label: "Employee" },
] as const;

export function formatEmployeeType(type: EmployeeType | null | undefined) {
  return EMPLOYEE_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? "Employee";
}

export function formatEmployeeOptionLabel(
  employee: Pick<Profile, "full_name" | "employee_type" | "employee_code"> & { email?: string }
) {
  const name = employee.full_name ?? employee.email ?? "Employee";
  const type = formatEmployeeType(employee.employee_type);
  const code = employee.employee_code ? ` · ${employee.employee_code}` : "";
  return `${name}${code} (${type})`;
}
