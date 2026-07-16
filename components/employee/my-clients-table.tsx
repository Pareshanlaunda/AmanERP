"use client";

import Link from "next/link";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { formatCurrency, formatDate } from "@/lib/format";
import { ClidBadge } from "@/components/shared/clid-badge";
import { NoticeSelectButton } from "@/components/shared/notice-select-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clientHasWhatsAppChat } from "@/lib/leads/attach-lead-sources";

export function MyClientsTable({
  clients,
  emptyMessage,
  latestNoticeIds = {},
  onNoticeSaved,
}: {
  clients: ClientOnboarding[];
  emptyMessage?: string;
  latestNoticeIds?: Record<string, string>;
  onNoticeSaved?: (clientId: string, noticeId: string) => void;
}) {
  if (clients.length === 0) {
    return (
      <div className="border border-dashed p-8 text-center text-muted-foreground">
        {emptyMessage ?? "No clients onboarded yet."}
      </div>
    );
  }

  return (
    <>
      <div className="hidden w-full lg:block">
        <table className="w-full border-collapse text-sm">
          <colgroup>
            <col className="w-[7.5rem]" />
            <col />
            <col className="w-[8.5rem]" />
            <col />
            <col className="w-[6.5rem]" />
            <col className="w-[7.5rem]" />
            <col className="w-[6.5rem]" />
            <col className="w-[7.5rem]" />
            <col className="w-[8.5rem]" />
          </colgroup>
          <thead>
            <tr className="bg-muted/40">
              <th className={thClass()}>CLID</th>
              <th className={thClass()}>Client</th>
              <th className={thClass()}>Phone</th>
              <th className={thClass()}>Email</th>
              <th className={thClass()}>Loan</th>
              <th className={thClass()}>Advocate</th>
              <th className={thClass()}>Submitted</th>
              <th className={thClass()}>Notice</th>
              <th className={thClass()}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-muted/30">
                <td className={tdClass()}>
                  <ClidBadge
                    clientId={client.client_id}
                    className="max-w-full truncate px-1.5 py-0.5 text-[11px] sm:text-xs"
                  />
                </td>
                <td className={tdClass("font-medium")} title={client.client_name}>
                  <span className="block truncate">{client.client_name}</span>
                </td>
                <td className={tdClass()} title={client.client_contact_number ?? undefined}>
                  <span className="block truncate">{client.client_contact_number ?? "—"}</span>
                </td>
                <td className={tdClass()} title={client.client_email ?? undefined}>
                  <span className="block truncate">{client.client_email ?? "—"}</span>
                </td>
                <td className={tdClass("whitespace-nowrap")}>
                  {formatCurrency(client.loan_amount)}
                </td>
                <td className={tdClass()} title={client.advocate_name}>
                  <span className="block truncate">{client.advocate_name}</span>
                </td>
                <td className={tdClass("whitespace-nowrap")}>
                  {formatDate(client.created_at)}
                </td>
                <td className={tdClass()}>
                  <NoticeSelectButton
                    client={client}
                    latestNoticeId={latestNoticeIds[client.id] ?? null}
                    onNoticeSaved={(noticeId) => onNoticeSaved?.(client.id, noticeId)}
                  />
                </td>
                <td className={tdClass()}>
                  <div className="flex flex-nowrap gap-1">
                    <Button variant="outline" size="sm" asChild className="h-8 px-2 text-xs">
                      <Link href={`/employee/clients/${client.id}`}>View</Link>
                    </Button>
                    {clientHasWhatsAppChat(client) ? (
                      <Button variant="secondary" size="sm" asChild className="h-8 px-2 text-xs">
                        <Link href={`/employee/clients/${client.id}#whatsapp-chat`}>Chat</Link>
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y border lg:hidden">
        {clients.map((client) => (
          <div key={client.id} className="space-y-2 px-3 py-3">
            <div className="flex items-center gap-2">
              <ClidBadge
                clientId={client.client_id}
                className="shrink-0 px-1.5 py-0.5 text-[11px]"
              />
              <div className="min-w-0 truncate font-medium">{client.client_name}</div>
            </div>
            <div className="space-y-0.5 text-sm text-muted-foreground">
              <p className="truncate">{client.client_email ?? "No email"}</p>
              <p>{client.client_contact_number ?? "No phone"}</p>
              <p>
                {formatCurrency(client.loan_amount)} · {client.advocate_name} ·{" "}
                {formatDate(client.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <NoticeSelectButton
                client={client}
                latestNoticeId={latestNoticeIds[client.id] ?? null}
                onNoticeSaved={(noticeId) => onNoticeSaved?.(client.id, noticeId)}
              />
              <Button variant="outline" size="sm" asChild className="h-8 px-2 text-xs">
                <Link href={`/employee/clients/${client.id}`}>View</Link>
              </Button>
              {clientHasWhatsAppChat(client) ? (
                <Button variant="secondary" size="sm" asChild className="h-8 px-2 text-xs">
                  <Link href={`/employee/clients/${client.id}#whatsapp-chat`}>Chat</Link>
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function thClass(extra?: string) {
  return cn(
    "border border-border px-2 py-1.5 text-left align-middle text-xs font-medium text-muted-foreground",
    extra
  );
}

function tdClass(extra?: string) {
  return cn(
    "border border-border px-2 py-1.5 align-middle overflow-hidden",
    extra
  );
}
