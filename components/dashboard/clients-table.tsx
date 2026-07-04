"use client";

import Link from "next/link";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { formatCurrency, formatDate } from "@/lib/format";
import { ClidBadge } from "@/components/shared/clid-badge";
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
import { useMemo, useState } from "react";
import { filterClients } from "@/lib/filters/list-search";

type ClientsTableProps = {
  clients: ClientOnboarding[];
  showClientId?: boolean;
  showSearch?: boolean;
  viewLinkPrefix?: string;
  emptyMessage?: string;
};

export function ClientsTable({
  clients,
  showClientId = false,
  showSearch = false,
  viewLinkPrefix,
  emptyMessage,
}: ClientsTableProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!showSearch) return clients;
    return filterClients(clients, query);
  }, [clients, query, showSearch]);

  const list = showSearch ? filtered : clients;

  return (
    <div className="space-y-4">
      {showSearch ? (
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search by client name or CLID..."
        />
      ) : null}

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {emptyMessage ??
            (clients.length === 0
              ? "No clients onboarded yet."
              : "No clients match your search.")}
        </div>
      ) : (
        <>
          <div className="table-desktop rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  {showClientId ? <TableHead>CLID</TableHead> : null}
                  <TableHead>Client Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Advocate</TableHead>
                  <TableHead>Submitted</TableHead>
                  {viewLinkPrefix ? <TableHead></TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((client) => (
                  <TableRow key={client.id}>
                    {showClientId ? (
                      <TableCell>
                        <ClidBadge clientId={client.client_id} />
                      </TableCell>
                    ) : null}
                    <TableCell className="font-medium">{client.client_name}</TableCell>
                    <TableCell>{client.client_email ?? "—"}</TableCell>
                    <TableCell>{client.client_contact_number ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(client.loan_amount)}</TableCell>
                    <TableCell>{client.advocate_name}</TableCell>
                    <TableCell>{formatDate(client.created_at)}</TableCell>
                    {viewLinkPrefix ? (
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`${viewLinkPrefix}/${client.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="table-mobile">
            {list.map((client) => (
              <div key={client.id} className="data-card">
                {showClientId ? <ClidBadge clientId={client.client_id} className="mb-2" /> : null}
                <div className="data-card-title">{client.client_name}</div>
                <div className="data-card-meta">
                  <p>{client.client_email ?? "No email"}</p>
                  <p>{client.client_contact_number ?? "No phone"}</p>
                  <p>Loan: {formatCurrency(client.loan_amount)}</p>
                  <p>Advocate: {client.advocate_name}</p>
                  <p>Submitted: {formatDate(client.created_at)}</p>
                </div>
                {viewLinkPrefix ? (
                  <div className="data-card-actions">
                    <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                      <Link href={`${viewLinkPrefix}/${client.id}`}>View full record</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
