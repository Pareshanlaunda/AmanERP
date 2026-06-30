"use client";

import { useCallback, useEffect, useState } from "react";
import { getEmployeesOverview } from "@/lib/actions/employees";
import type { EmployeeStats } from "@/lib/types/database";
import { useRealtimeInvalidation } from "@/lib/hooks/use-realtime-record";
import { EmployeesOverview } from "@/components/admin/employees-overview";

type RealtimeEmployeesOverviewProps = {
  initialEmployees: EmployeeStats[];
};

export function RealtimeEmployeesOverview({ initialEmployees }: RealtimeEmployeesOverviewProps) {
  const [employees, setEmployees] = useState(initialEmployees);

  useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  const refresh = useCallback(() => {
    void getEmployeesOverview().then(setEmployees);
  }, []);

  useRealtimeInvalidation(
    "admin:employee-stats",
    ["leads", "client_onboardings", "profiles"],
    refresh
  );

  return <EmployeesOverview employees={employees} />;
}
