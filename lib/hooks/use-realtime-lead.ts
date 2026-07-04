"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/lib/types/database";

export function useRealtimeLead(initialLead: Lead) {
  const [lead, setLead] = useState(initialLead);
  const initialLeadRef = useRef(initialLead);
  initialLeadRef.current = initialLead;

  useEffect(() => {
    setLead(initialLeadRef.current);
  }, [initialLead.id]);

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
