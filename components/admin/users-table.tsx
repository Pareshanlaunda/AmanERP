"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Profile } from "@/lib/types/database";
import { EMPLOYEE_TYPE_LABELS } from "@/lib/types/database";
import { formatDate } from "@/lib/format";
import { filterUsers } from "@/lib/filters/list-search";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { SearchBar } from "@/components/dashboard/search-bar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UsersTableProps = {
  users: (Profile & { email?: string })[];
};

export function UsersTable({ users }: UsersTableProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterUsers(users, query), [users, query]);

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
        No users yet. Create the first user above.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search by name, EMPID, email, role, or type..."
      />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No users match your search.
        </div>
      ) : (
        <>
          <div className="table-desktop rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {user.employee_code ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.role === "employee" ? (
                        <Link
                          href={`/admin/employees/${user.id}`}
                          className="text-primary hover:underline"
                        >
                          {user.full_name ?? "—"}
                        </Link>
                      ) : (
                        (user.full_name ?? "—")
                      )}
                      {user.role === "employee" && user.is_active === false ? (
                        <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                          Removed
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{user.email ?? "—"}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>
                      {user.role === "employee"
                        ? EMPLOYEE_TYPE_LABELS[user.employee_type ?? "general"]
                        : "—"}
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {user.role === "employee" ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/employees/${user.id}`}>View</Link>
                          </Button>
                        ) : null}
                        <ResetPasswordButton
                          userId={user.id}
                          userName={user.full_name?.trim() || user.email || "user"}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="table-mobile space-y-3">
            {filtered.map((user) => (
              <div key={user.id} className="data-card">
                <div className="data-card-header">
                  <div className="min-w-0">
                    <div className="data-card-title">{user.full_name ?? "—"}</div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {user.employee_code ?? "—"}
                    </p>
                    <p className="mt-1 break-all text-muted-foreground">{user.email ?? "—"}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs font-semibold capitalize">
                    {user.role}
                  </span>
                </div>
                <p className="mt-3 text-muted-foreground">Created: {formatDate(user.created_at)}</p>
                {user.role === "employee" ? (
                  <p className="mt-1 text-muted-foreground">
                    Type: {EMPLOYEE_TYPE_LABELS[user.employee_type ?? "general"]}
                  </p>
                ) : null}
                <div className="data-card-actions mt-3 flex flex-wrap gap-2">
                  {user.role === "employee" ? (
                    <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                      <Link href={`/admin/employees/${user.id}`}>View</Link>
                    </Button>
                  ) : null}
                  <ResetPasswordButton
                    userId={user.id}
                    userName={user.full_name?.trim() || user.email || "user"}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
