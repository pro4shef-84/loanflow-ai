"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database.types";

type PulseEventRow = Database["public"]["Tables"]["pulse_events"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];

export type PulseEventWithContact = PulseEventRow & {
  contacts?: ContactRow | null;
};

export function usePulseEvents() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["pulse-events"],
    queryFn: async (): Promise<PulseEventWithContact[]> => {
      const { data, error } = await supabase
        .from("pulse_events")
        .select("*, contacts(*)")
        .eq("action_taken", "pending")
        .order("detected_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as PulseEventWithContact[];
    },
  });
}

export function useUpdatePulseEvent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      actionTaken,
    }: {
      id: string;
      actionTaken: PulseEventRow["action_taken"];
    }): Promise<PulseEventRow> => {
      const { data, error } = await supabase
        .from("pulse_events")
        .update({ action_taken: actionTaken, actioned_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as PulseEventRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pulse-events"] });
    },
  });
}
