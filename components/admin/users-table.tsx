import type { Profile } from "@/lib/types/database";
import { EMPLOYEE_TYPE_LABELS } from "@/lib/types/database";

import { formatDate } from "@/lib/format";

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

  if (users.length === 0) {

    return (

      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">

        No users yet. Create the first user above.

      </div>

    );

  }



  return (

    <>

      <div className="table-desktop rounded-lg border bg-card">

        <Table>

          <TableHeader>

            <TableRow>

              <TableHead>Name</TableHead>

              <TableHead>Email</TableHead>

              <TableHead>Role</TableHead>

              <TableHead>Type</TableHead>

              <TableHead>Created</TableHead>

            </TableRow>

          </TableHeader>

          <TableBody>

            {users.map((user) => (

              <TableRow key={user.id}>

                <TableCell className="font-medium">{user.full_name ?? "—"}</TableCell>

                <TableCell>{user.email ?? "—"}</TableCell>

                <TableCell className="capitalize">{user.role}</TableCell>

                <TableCell>
                  {user.role === "employee"
                    ? EMPLOYEE_TYPE_LABELS[user.employee_type ?? "general"]
                    : "—"}
                </TableCell>

                <TableCell>{formatDate(user.created_at)}</TableCell>

              </TableRow>

            ))}

          </TableBody>

        </Table>

      </div>



      <div className="table-mobile">

        {users.map((user) => (

          <div key={user.id} className="data-card">

            <div className="data-card-header">

              <div className="min-w-0">

                <div className="data-card-title">{user.full_name ?? "—"}</div>

                <p className="mt-1 break-all text-muted-foreground">{user.email ?? "—"}</p>

              </div>

              <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs font-semibold capitalize">

                {user.role}

              </span>

            </div>

            <p className="mt-3 text-muted-foreground">Created: {formatDate(user.created_at)}</p>
            {user.role === "employee" && (
              <p className="mt-1 text-muted-foreground">
                Type: {EMPLOYEE_TYPE_LABELS[user.employee_type ?? "general"]}
              </p>
            )}

          </div>

        ))}

      </div>

    </>

  );

}

