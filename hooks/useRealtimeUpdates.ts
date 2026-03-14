"use client";

// ============================================================
// REAL-TIME UPDATES HOOK
// Subscribes to Supabase real-time changes for document_requirements,
// documents, and escalations — auto-invalidates React Query cache.
// ============================================================

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeUpdatesOptions {
  loanFileId: string;
  enabled?: boolean;
}

/**
 * Subscribe to real-time changes on document_requirements, documents, and
 * escalations for a specific loan. Automatically invalidates the relevant
 * React Query caches when changes are detected.
 */
export function useRealtimeUpdates({ loanFileId, enabled = true }: UseRealtimeUpdatesOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !loanFileId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`loan-realtime-${loanFileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "document_requirements",
          filter: `loan_file_id=eq.${loanFileId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["loans", loanFileId] });
          queryClient.invalidateQueries({ queryKey: ["document-requirements", loanFileId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "documents",
          filter: `loan_file_id=eq.${loanFileId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["documents", loanFileId] });
          queryClient.invalidateQueries({ queryKey: ["loans", loanFileId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "escalations",
          filter: `loan_file_id=eq.${loanFileId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["escalations", loanFileId] });
          queryClient.invalidateQueries({ queryKey: ["loans", loanFileId] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loanFileId, enabled, queryClient]);
}
