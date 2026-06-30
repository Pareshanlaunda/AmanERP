"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type RealtimeTable =
  | "leads"
  | "lead_comments"
  | "lead_updates"
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
}: UseRealtimeRowsOptions<T>) {
  const [rows, setRows] = useState(initialRows);
  const includeRowRef = useRef(includeRow);
  const onRowRef = useRef(onRow);
  includeRowRef.current = includeRow;
  onRowRef.current = onRow;

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
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
          const shouldInclude = includeRowRef.current?.(row, event) ?? true;
          onRowRef.current?.(row, event);

          setRows((prev) => {
            if (!shouldInclude) {
              return prev.filter((item) => item.id !== row.id);
            }

            const exists = prev.some((item) => item.id === row.id);
            const next = exists
              ? prev.map((item) => (item.id === row.id ? row : item))
              : [row, ...prev];

            return sortRows(next, sortBy, sortDescending);
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, channelName, filter, sortBy, sortDescending]);

  return rows;
}
