"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database.types";
import type {
  EscalationCategory,
  EscalationSeverity,
  EscalationStatus,
} from "@/lib/domain";

type EscalationRow = Database["public"]["Tables"]["escalations"]["Row"];

/** Typed escalation with domain enums. */
export type TypedEscalation = Omit<EscalationRow, "category" | "severity" | "status"> & {
  category: EscalationCategory;
  severity: EscalationSeverity;
  status: EscalationStatus;
};

/** Escalation with joined loan info for the queue page. */
export type EscalationWithLoan = TypedEscalation & {
  loan_files?: {
    id: string;
    file_number: string | null;
    borrower_id: string | null;
    contacts?: {
      first_name: string;
      last_name: string;
    } | null;
  } | null;
};

export function useEscalations(loanFileId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["escalations", loanFileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalations")
        .select("*")
        .eq("loan_file_id", loanFileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as TypedEscalation[];
    },
    enabled: !!loanFileId,
  });
}

export function useAllEscalations() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["escalations-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalations")
        .select("*, loan_files(id, file_number, borrower_id, contacts(first_name, last_name))")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as EscalationWithLoan[];
    },
  });
}

export function useOpenEscalationCount() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["escalations-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("escalations")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "acknowledged"]);

      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });
}

export function useResolveEscalation() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      escalationId,
      resolutionNotes,
    }: {
      escalationId: string;
      resolutionNotes: string;
    }) => {
      const { data, error } = await supabase
        .from("escalations")
        .update({
          status: "resolved",
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", escalationId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as TypedEscalation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalations"] });
      queryClient.invalidateQueries({ queryKey: ["escalations-all"] });
      queryClient.invalidateQueries({ queryKey: ["escalations-count"] });
    },
  });
}

export function useDismissEscalation() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ escalationId }: { escalationId: string }) => {
      const { data, error } = await supabase
        .from("escalations")
        .update({
          status: "dismissed",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", escalationId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as TypedEscalation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalations"] });
      queryClient.invalidateQueries({ queryKey: ["escalations-all"] });
      queryClient.invalidateQueries({ queryKey: ["escalations-count"] });
    },
  });
}
