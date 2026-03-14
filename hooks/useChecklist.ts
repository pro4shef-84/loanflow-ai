"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database.types";
import type { DocumentRequirementState, RequiredDocType } from "@/lib/domain";

type DocumentRequirementRow = Database["public"]["Tables"]["document_requirements"]["Row"];

/** Typed requirement with domain enums. */
export type TypedDocumentRequirement = Omit<DocumentRequirementRow, "doc_type" | "state"> & {
  doc_type: RequiredDocType;
  state: DocumentRequirementState;
};

export function useChecklist(loanFileId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["checklist", loanFileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_requirements")
        .select("*")
        .eq("loan_file_id", loanFileId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as TypedDocumentRequirement[];
    },
    enabled: !!loanFileId,
  });
}

export function useGenerateChecklist(loanFileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/loans/${loanFileId}/checklist/generate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to generate checklist");
      return json.data as TypedDocumentRequirement[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist", loanFileId] });
      queryClient.invalidateQueries({ queryKey: ["loans", loanFileId] });
    },
  });
}

export function useWaiveRequirement(loanFileId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requirementId, notes }: { requirementId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("document_requirements")
        .update({
          state: "waived_by_officer",
          notes: notes ?? "Waived by officer",
        })
        .eq("id", requirementId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as TypedDocumentRequirement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist", loanFileId] });
    },
  });
}
