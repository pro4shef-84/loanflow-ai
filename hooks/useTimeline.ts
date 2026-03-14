"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database.types";
import type { FileCompletionEventType } from "@/lib/domain";

type FileCompletionEventRow = Database["public"]["Tables"]["file_completion_events"]["Row"];

/** Typed event with domain enum. */
export type TypedFileCompletionEvent = Omit<FileCompletionEventRow, "event_type"> & {
  event_type: FileCompletionEventType;
};

export function useTimeline(loanFileId: string, limit = 20, offset = 0) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["timeline", loanFileId, limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("file_completion_events")
        .select("*")
        .eq("loan_file_id", loanFileId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data ?? []) as unknown as TypedFileCompletionEvent[];
    },
    enabled: !!loanFileId,
  });
}
