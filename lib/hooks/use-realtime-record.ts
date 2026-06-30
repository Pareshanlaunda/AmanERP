"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeTable } from "@/lib/hooks/use-realtime-rows";

type UseRealtimeRecordOptions<T extends { id: string }> = {
  table: RealtimeTable;
  recordId: string | null | undefined;
  initialRecord: T | null;
  channelName: string;
};

export function useRealtimeRecord<T extends { id: string }>({
  table,
  recordId,
  initialRecord,
  channelName,
}: UseRealtimeRecordOptions<T>) {
  const [record, setRecord] = useState<T | null>(initialRecord);

  useEffect(() => {
    setRecord(initialRecord);
  }, [initialRecord]);

  useEffect(() => {
    if (!recordId) {
      setRecord(null);
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `id=eq.${recordId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setRecord(null);
            return;
          }
          setRecord(payload.new as T);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, recordId, channelName]);

  return record;
}

export function useRealtimeInvalidation(
  channelName: string,
  tables: RealtimeTable[],
  onInvalidate: () => void,
  debounceMs = 400
) {
  const onInvalidateRef = useRef(onInvalidate);
  onInvalidateRef.current = onInvalidate;
  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onInvalidateRef.current(), debounceMs);
    };

    const channel = supabase.channel(channelName);
    for (const table of tablesRef.current) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, schedule);
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [channelName, debounceMs, tables.join(",")]);
}
