"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/lib/types/database";

export function useRealtimeLead(initialLead: Lead) {
  const [lead, setLead] = useState(initialLead);

  useEffect(() => {
    setLead(initialLead);
  }, [initialLead]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`lead:${initialLead.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `id=eq.${initialLead.id}`,
        },
        (payload) => {
          setLead(payload.new as Lead);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [initialLead.id]);

  return lead;
}
