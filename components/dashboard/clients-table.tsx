"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { formatCurrency, formatDate } from "@/lib/format";
import { CidBadge } from "@/components/shared/cid-badge";
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

type ClientsTableProps = {
  clients: ClientOnboarding[];
  showClientId?: boolean;
  showSearch?: boolean;
  viewLinkPrefix?: string;
};

export function ClientsTable({
  clients,
  showClientId = false,
  showSearch = false,
  viewLinkPrefix,
}: ClientsTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.client_name.toLowerCase().includes(q) ||
        (c.client_id?.toLowerCase().includes(q) ?? false) ||
        (c.client_email?.toLowerCase().includes(q) ?? false) ||
        (c.client_contact_number?.toLowerCase().includes(q) ?? false)
    );
  }, [clients, query]);

  return (
    <div className="space-y-4">
      {showSearch && (
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search by client name or CID..."
        />
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {clients.length === 0
            ? "No clients onboarded yet."
            : "No clients match your search."}
        </div>
      ) : (
        <>
          <div className="table-desktop rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  {showClientId && <TableHead>Client ID</TableHead>}
                  <TableHead>Client Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Advocate</TableHead>
                  <TableHead>Submitted</TableHead>
                  {viewLinkPrefix && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => (
                  <TableRow key={client.id}>
                    {showClientId && (
                      <TableCell>
                        <CidBadge clientId={client.client_id} />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{client.client_name}</TableCell>
                    <TableCell>{client.client_email ?? "—"}</TableCell>
                    <TableCell>{client.client_contact_number ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(client.loan_amount)}</TableCell>
                    <TableCell>{client.advocate_name}</TableCell>
                    <TableCell>{formatDate(client.created_at)}</TableCell>
                    {viewLinkPrefix && (
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`${viewLinkPrefix}/${client.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="table-mobile">
            {filtered.map((client) => (
              <div key={client.id} className="data-card">
                {showClientId && <CidBadge clientId={client.client_id} className="mb-2" />}
                <div className="data-card-title">{client.client_name}</div>
                <div className="data-card-meta">
                  <p>{client.client_email ?? "No email"}</p>
                  <p>{client.client_contact_number ?? "No phone"}</p>
                  <p>Loan: {formatCurrency(client.loan_amount)}</p>
                  <p>Advocate: {client.advocate_name}</p>
                  <p>Submitted: {formatDate(client.created_at)}</p>
                </div>
                {viewLinkPrefix && (
                  <div className="data-card-actions">
                    <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                      <Link href={`${viewLinkPrefix}/${client.id}`}>View full record</Link>
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
