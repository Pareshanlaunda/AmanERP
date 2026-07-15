"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mergeLeadRealtimeRow } from "@/lib/leads/assignees";

export type RealtimeTable =
  | "leads"
  | "lead_comments"
  | "lead_updates"
  | "lead_additional_assignees"
  | "notifications"
  | "client_onboardings"
  | "profiles";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

type UseRealtimeRowsOptions<T extends { id: string }> = {
  table: RealtimeTable;
  initialRows: T[];
  channelName: string;
  filter?: string;
  sortBy?: keyof T;
  sortDescending?: boolean;
  includeRow?: (row: T, event: RealtimeEvent) => boolean;
  onRow?: (row: T, event: RealtimeEvent) => void;
  enabled?: boolean;
};

function sortRows<T extends { id: string }>(
  rows: T[],
  sortBy?: keyof T,
  sortDescending = true
) {
  if (!sortBy) return rows;
  return [...rows].sort((a, b) => {
    const av = String(a[sortBy] ?? "");
    const bv = String(b[sortBy] ?? "");
    return sortDescending ? bv.localeCompare(av) : av.localeCompare(bv);
  });
}

export function useRealtimeRows<T extends { id: string }>({
  table,
  initialRows,
  channelName,
  filter,
  sortBy,
  sortDescending = true,
  includeRow,
  onRow,
  enabled = true,
}: UseRealtimeRowsOptions<T>) {
  const [rows, setRows] = useState(initialRows);
  const includeRowRef = useRef(includeRow);
  const onRowRef = useRef(onRow);
  const initialRowsRef = useRef(initialRows);
  initialRowsRef.current = initialRows;
  includeRowRef.current = includeRow;
  onRowRef.current = onRow;

  const initialRowsKey = initialRows.map((row) => row.id).join(",");

  useEffect(() => {
    setRows(initialRowsRef.current);
  }, [initialRowsKey]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const event = payload.eventType as RealtimeEvent;

          if (event === "DELETE") {
            const old = payload.old as T;
            setRows((prev) => prev.filter((row) => row.id !== old.id));
            return;
          }

          const row = payload.new as T;

          setRows((prev) => {
            const previous = prev.find((item) => item.id === row.id);
            const merged =
              table === "leads"
                ? mergeLeadRealtimeRow(
                    previous as T & { additional_assignee_ids?: string[] | null },
                    row as T & { additional_assignee_ids?: string[] | null }
                  )
                : row;

            const include = includeRowRef.current?.(merged, event) ?? true;
            onRowRef.current?.(merged, event);

            if (!include) {
              return prev.filter((item) => item.id !== merged.id);
            }

            const exists = Boolean(previous);
            const next = exists
              ? prev.map((item) => (item.id === merged.id ? merged : item))
              : [merged, ...prev];

            return sortRows(next, sortBy, sortDescending);
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, channelName, filter, sortBy, sortDescending, enabled]);

  return rows;
}
