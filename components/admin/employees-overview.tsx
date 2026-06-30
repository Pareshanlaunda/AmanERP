import Link from "next/link";

import { UserPlus } from "lucide-react";

import type { EmployeeStats } from "@/lib/types/database";

import { Button } from "@/components/ui/button";

import {

  Table,

  TableBody,

  TableCell,

  TableHead,

  TableHeader,

  TableRow,

} from "@/components/ui/table";



export function EmployeesOverview({ employees }: { employees: EmployeeStats[] }) {

  return (

    <section className="erp-panel overflow-hidden">

      <div className="flex flex-col gap-3 border-b border-border/70 bg-accent/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <div>

          <h2 className="section-title">Employees</h2>

          <p className="section-subtitle">{employees.length} team members</p>

        </div>

        <Button asChild size="sm" className="w-full sm:w-auto">

          <Link href="/admin/users">

            <UserPlus className="h-4 w-4" />

            Add user

          </Link>

        </Button>

      </div>

      <div className="p-4 sm:p-6">

        {employees.length === 0 ? (

          <div className="rounded-lg border border-dashed p-8 text-center">

            <p className="text-sm text-muted-foreground">No employees found yet.</p>

            <Button asChild className="mt-4 w-full sm:w-auto" size="sm">

              <Link href="/admin/users">

                <UserPlus className="h-4 w-4" />

                Add user

              </Link>

            </Button>

          </div>

        ) : (

          <>

            <div className="table-desktop rounded-lg border">

              <Table>

                <TableHeader>

                  <TableRow>

                    <TableHead>Employee</TableHead>

                    <TableHead>Email</TableHead>

                    <TableHead className="text-center">Assigned</TableHead>

                    <TableHead className="text-center">In Progress</TableHead>

                    <TableHead className="text-center">Converted</TableHead>

                    <TableHead className="text-center">Total Leads</TableHead>

                    <TableHead className="text-center">Clients</TableHead>

                  </TableRow>

                </TableHeader>

                <TableBody>

                  {employees.map((employee) => (

                    <TableRow key={employee.id}>

                      <TableCell>

                        <Link

                          href={`/admin/employees/${employee.id}`}

                          className="font-medium text-primary hover:underline"

                        >

                          {employee.full_name ?? "Employee"}

                        </Link>

                      </TableCell>

                      <TableCell className="text-muted-foreground">

                        {employee.email ?? "—"}

                      </TableCell>

                      <TableCell className="text-center">

                        <span className="stat-pill">{employee.assigned_count}</span>

                      </TableCell>

                      <TableCell className="text-center">

                        <span className="stat-pill">{employee.in_progress_count}</span>

                      </TableCell>

                      <TableCell className="text-center">

                        <span className="stat-pill">{employee.converted_count}</span>

                      </TableCell>

                      <TableCell className="text-center">

                        <span className="stat-pill">{employee.total_leads}</span>

                      </TableCell>

                      <TableCell className="text-center">

                        <span className="stat-pill">{employee.total_clients}</span>

                      </TableCell>

                    </TableRow>

                  ))}

                </TableBody>

              </Table>

            </div>



            <div className="table-mobile">

              {employees.map((employee) => (

                <div key={employee.id} className="data-card">

                  <Link

                    href={`/admin/employees/${employee.id}`}

                    className="data-card-title text-primary hover:underline"

                  >

                    {employee.full_name ?? "Employee"}

                  </Link>

                  <p className="mt-1 break-all text-muted-foreground">{employee.email ?? "—"}</p>

                  <div className="mobile-stat-grid mt-4">

                    <div className="mobile-stat-item">

                      <div className="mobile-stat-label">Assigned</div>

                      <div className="mobile-stat-value">{employee.assigned_count}</div>

                    </div>

                    <div className="mobile-stat-item">

                      <div className="mobile-stat-label">In progress</div>

                      <div className="mobile-stat-value">{employee.in_progress_count}</div>

                    </div>

                    <div className="mobile-stat-item">

                      <div className="mobile-stat-label">Converted</div>

                      <div className="mobile-stat-value">{employee.converted_count}</div>

                    </div>

                    <div className="mobile-stat-item">

                      <div className="mobile-stat-label">Leads</div>

                      <div className="mobile-stat-value">{employee.total_leads}</div>

                    </div>

                    <div className="mobile-stat-item col-span-2 sm:col-span-1">

                      <div className="mobile-stat-label">Clients</div>

                      <div className="mobile-stat-value">{employee.total_clients}</div>

                    </div>

                  </div>

                  <div className="data-card-actions">

                    <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">

                      <Link href={`/admin/employees/${employee.id}`}>View profile</Link>

                    </Button>

                  </div>

                </div>

              ))}

            </div>

          </>

        )}

      </div>

    </section>

  );

}

