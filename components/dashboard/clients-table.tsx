"use client";

import { useMemo, useState } from "react";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { formatCurrency, formatDate } from "@/lib/format";
import { SearchBar } from "@/components/dashboard/search-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ClientsTableProps = {
  clients: ClientOnboarding[];
};

export function ClientsTable({ clients }: ClientsTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.client_name.toLowerCase().includes(q));
  }, [clients, query]);

  return (
    <div className="space-y-4">
      <SearchBar value={query} onChange={setQuery} />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          {clients.length === 0
            ? "No client onboardings yet. Click \"New Client Onboarding\" to add one."
            : "No clients match your search."}
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Loan Amount</TableHead>
                <TableHead>Advocate</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.client_name}</TableCell>
                  <TableCell>{client.client_email ?? "—"}</TableCell>
                  <TableCell>{client.client_contact_number ?? "—"}</TableCell>
                  <TableCell>{formatCurrency(client.loan_amount)}</TableCell>
                  <TableCell>{client.advocate_name}</TableCell>
                  <TableCell>{formatDate(client.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
