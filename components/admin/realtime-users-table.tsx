"use client";

import { useCallback, useState } from "react";
import { listUsers } from "@/lib/actions/users";
import type { Profile } from "@/lib/types/database";
import { useRealtimeInvalidation } from "@/lib/hooks/use-realtime-record";
import { UsersTable } from "@/components/admin/users-table";

type RealtimeUsersTableProps = {
  initialUsers: (Profile & { email?: string })[];
};

export function RealtimeUsersTable({ initialUsers }: RealtimeUsersTableProps) {
  const [users, setUsers] = useState(initialUsers);

  const refresh = useCallback(() => {
    void listUsers().then(setUsers);
  }, []);

  useRealtimeInvalidation("admin:users", ["profiles"], refresh);

  return <UsersTable users={users} />;
}
