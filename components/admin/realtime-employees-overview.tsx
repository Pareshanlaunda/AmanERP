"use client";

import { useCallback, useState } from "react";
import { getEmployeesOverview } from "@/lib/actions/employees";
import type { EmployeeStats } from "@/lib/types/database";
import { useRealtimeInvalidation } from "@/lib/hooks/use-realtime-record";
import { EmployeesOverview } from "@/components/admin/employees-overview";

type RealtimeEmployeesOverviewProps = {
  initialEmployees: EmployeeStats[];
};

export function RealtimeEmployeesOverview({ initialEmployees }: RealtimeEmployeesOverviewProps) {
  const [employees, setEmployees] = useState(initialEmployees);

  const refresh = useCallback(() => {
    void getEmployeesOverview()
      .then(setEmployees)
      .catch((err) => {
        console.error("[employee-overview] refresh failed", err);
      });
  }, []);

  useRealtimeInvalidation(
    "admin:employee-stats",
    ["leads", "client_onboardings", "profiles", "lead_additional_assignees"],
    refresh
  );

  return <EmployeesOverview employees={employees} />;
}
